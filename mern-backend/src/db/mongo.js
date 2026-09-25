import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lingesw0561_db_user:wYzDBE5eeNyKdiMI@shipfastcluster.6pkdcqc.mongodb.net/shipfast?retryWrites=true&w=majority';

let activeClient = null;
let activeDb = null;

export async function getDb(uri = MONGODB_URI) {
  if (activeDb) {
    return activeDb;
  }

  activeClient = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });

  await activeClient.connect();
  activeDb = activeClient.db('shipfast');
  return activeDb;
}

export async function closeDb() {
  if (activeClient) {
    try {
      await activeClient.close();
    } catch (_) {}
    activeClient = null;
    activeDb = null;
  }
}

// Query cursor wrapper supporting chaining .sort(), .limit(), .skip(), .lean(), and thenable/await
class QueryCursor {
  constructor(getColFn, filter = {}, options = {}) {
    this._getColFn = getColFn;
    this._filter = filter || {};
    this._options = options || {};
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._isLean = false;
    this._docWrapper = null;
  }

  setDocWrapper(wrapper) {
    this._docWrapper = wrapper;
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(num) {
    this._limit = num;
    return this;
  }

  skip(num) {
    this._skip = num;
    return this;
  }

  lean() {
    this._isLean = true;
    return this;
  }

  async exec() {
    const col = await this._getColFn();
    let cursor = col.find(this._filter || {}, this._options || {});
    if (this._sort) cursor = cursor.sort(this._sort);
    if (this._skip) cursor = cursor.skip(this._skip);
    if (this._limit) cursor = cursor.limit(this._limit);

    const docs = await cursor.toArray();
    if (this._isLean || !this._docWrapper) {
      return docs || [];
    }
    return (docs || []).map(d => this._docWrapper(d));
  }

  then(onResolve, onReject) {
    return this.exec().then(onResolve, onReject);
  }

  catch(onReject) {
    return this.exec().catch(onReject);
  }
}

export function createModel(collectionName, methods = {}, defaults = {}) {
  const getCol = async () => {
    const db = await getDb();
    return db.collection(collectionName);
  };

  function Document(data = {}) {
    const docData = { ...defaults, ...data };
    if (!docData.createdAt) docData.createdAt = new Date();
    if (!docData.updatedAt) docData.updatedAt = new Date();
    Object.assign(this, docData);
  }

  // Attach custom methods to prototype
  for (const [key, fn] of Object.entries(methods)) {
    Document.prototype[key] = fn;
  }

  // Default save method
  Document.prototype.save = async function () {
    const col = await getCol();
    this.updatedAt = new Date();

    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    const plain = {};
    for (const key of Object.keys(this)) {
      if (key !== '_id' && typeof this[key] !== 'function') {
        plain[key] = this[key];
      }
    }

    if (this._id) {
      await col.updateOne({ _id: this._id }, { $set: plain });
    } else {
      const idKey = this.id ? 'id' : (this.userId ? 'userId' : (this.trackingNumber ? 'trackingNumber' : (this.branchId ? 'branchId' : (this.vehicleId ? 'vehicleId' : (this.requestId ? 'requestId' : (this.runSheetId ? 'runSheetId' : (this.ticketId ? 'ticketId' : (this.notificationId ? 'notificationId' : (this.collectionId ? 'collectionId' : null)))))))));
      if (idKey && this[idKey]) {
        const res = await col.updateOne({ [idKey]: this[idKey] }, { $set: plain }, { upsert: true });
        if (res.upsertedId) {
          this._id = res.upsertedId;
        }
      } else {
        const res = await col.insertOne(plain);
        this._id = res.insertedId;
      }
    }
    return this;
  };

  const wrapDoc = (raw) => {
    if (!raw) return null;
    const doc = new Document(raw);
    doc._id = raw._id;
    return doc;
  };

  const Model = function (data) {
    return new Document(data);
  };

  Model.collectionName = collectionName;

  Model.find = function (filter = {}, projection = null, options = {}) {
    const q = new QueryCursor(getCol, filter, options);
    q.setDocWrapper(wrapDoc);
    return q;
  };

  Model.findOne = async function (filter = {}, projection = null, options = {}) {
    const col = await getCol();
    let query = col.find(filter, options);
    const docs = await query.limit(1).toArray();
    if (!docs || docs.length === 0) return null;
    return wrapDoc(docs[0]);
  };

  Model.findById = async function (id, projection = null, options = {}) {
    return Model.findOne({ $or: [{ _id: id }, { id: id }, { userId: id }] }, projection, options);
  };

  Model.countDocuments = async function (filter = {}) {
    const col = await getCol();
    return col.countDocuments(filter);
  };

  Model.create = async function (data) {
    if (Array.isArray(data)) {
      const docs = data.map(d => new Document(d));
      for (const d of docs) {
        await d.save();
      }
      return docs;
    }
    const doc = new Document(data);
    await doc.save();
    return doc;
  };

  Model.updateOne = async function (filter, update, options = {}) {
    const col = await getCol();
    return col.updateOne(filter, update, options);
  };

  Model.updateMany = async function (filter, update, options = {}) {
    const col = await getCol();
    return col.updateMany(filter, update, options);
  };

  Model.findOneAndUpdate = async function (filter, update, options = { returnDocument: 'after' }) {
    const col = await getCol();
    const res = await col.findOneAndUpdate(filter, update, { returnDocument: 'after', ...options });
    const val = res?.value || res;
    return wrapDoc(val);
  };

  Model.deleteOne = async function (filter) {
    const col = await getCol();
    return col.deleteOne(filter);
  };

  Model.deleteMany = async function (filter) {
    const col = await getCol();
    return col.deleteMany(filter);
  };

  Model.insertMany = async function (items) {
    const col = await getCol();
    const prepared = items.map(item => {
      const d = { ...defaults, ...item };
      if (!d.createdAt) d.createdAt = new Date();
      if (!d.updatedAt) d.updatedAt = new Date();
      return d;
    });
    const res = await col.insertMany(prepared);
    return prepared.map((d, i) => {
      d._id = res.insertedIds[i];
      return wrapDoc(d);
    });
  };

  return Model;
}
