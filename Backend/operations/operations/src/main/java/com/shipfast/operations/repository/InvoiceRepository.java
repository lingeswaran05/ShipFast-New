package com.shipfast.operations.repository;

import com.shipfast.operations.entity.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {
}
