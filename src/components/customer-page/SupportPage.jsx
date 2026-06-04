import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Plus, Send, Clock, AlertCircle, Search, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useShipment } from '../../context/ShipmentContext';
import { toast } from 'sonner';

const STATUS_STYLES = {
  OPEN: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-slate-50 text-slate-700 border-slate-200'
};

const PRIORITY_STYLES = {
  HIGH: 'text-red-600 bg-red-50',
  MEDIUM: 'text-amber-600 bg-amber-50',
  LOW: 'text-blue-600 bg-blue-50'
};

const normalize = (value, fallback = '') => String(value || fallback).trim().toUpperCase().replace(/ /g, '_');

export function SupportPage() {
  const {
    currentUser,
    getSupportTickets,
    createSupportTicket,
    closeSupportTicket,
    deleteSupportTicket,
    replySupportTicket
  } = useShipment();

  const [activeTab, setActiveTab] = useState('list');
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'Shipment Issue',
    message: '',
    priority: 'Medium'
  });

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const fetchTickets = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const data = await getSupportTickets(currentUser?.userId || currentUser?.id);
      setTickets(data);
      if (data.length === 0) {
        setSelectedTicketId(null);
      } else if (!selectedTicketId || !data.some((ticket) => ticket.id === selectedTicketId)) {
        setSelectedTicketId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch tickets', error);
      toast.error('Failed to load tickets');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
    }
  }, [currentUser?.userId, currentUser?.id]);

  useEffect(() => {
    if (!currentUser || activeTab !== 'list') return undefined;
    const interval = setInterval(() => {
      fetchTickets({ silent: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.userId, currentUser?.id, activeTab, selectedTicketId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const ticket = await createSupportTicket({
        ...newTicket,
        userId: currentUser?.userId || currentUser?.id,
        status: 'OPEN'
      });
      const updated = [ticket, ...tickets];
      setTickets(updated);
      setSelectedTicketId(ticket.id);
      setActiveTab('list');
      setNewTicket({ subject: '', category: 'Shipment Issue', message: '', priority: 'Medium' });
      toast.success('Ticket raised successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to create ticket');
    }
  };

  const handleClose = async (ticketId) => {
    try {
      const closed = await closeSupportTicket(ticketId);
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? closed : ticket)));
      toast.success('Ticket closed');
    } catch (error) {
      toast.error(error.message || 'Failed to close ticket');
    }
  };

  const handleDelete = async (ticketId) => {
    try {
      await deleteSupportTicket(ticketId);
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      if (selectedTicketId === ticketId) {
        const next = tickets.find((ticket) => ticket.id !== ticketId);
        setSelectedTicketId(next?.id || null);
      }
      toast.success('Ticket deleted');
    } catch (error) {
      toast.error(error.message || 'Failed to delete ticket');
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      setIsReplying(true);
      const updatedTicket = await replySupportTicket(selectedTicket.id, replyMessage.trim());
      setTickets((prev) => prev.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket)));
      setReplyMessage('');
      toast.success('Reply sent');
    } catch (error) {
      toast.error(error.message || 'Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const subject = String(ticket.subject || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || subject.includes(query) || String(ticket.id || '').toLowerCase().includes(query);
    const matchesPriority = priorityFilter === 'ALL' || normalize(ticket.priority) === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Support & Tickets</h2>
          <p className="text-slate-500">Raise tickets, chat with support, and track resolution</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTickets()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            New Ticket
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Create New Ticket</h3>
            <button onClick={() => setActiveTab('list')} className="text-sm text-slate-500 hover:text-slate-900">Cancel</button>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Subject</label>
                <input
                  required
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief issue summary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                >
                  <option>Shipment Issue</option>
                  <option>Billing / Invoice</option>
                  <option>Account Support</option>
                  <option>Technical Issue</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <div className="flex gap-4">
                {['Low', 'Medium', 'High'].map((priority) => (
                  <label key={priority} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={priority}
                      checked={newTicket.priority === priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-600">{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Message</label>
              <textarea
                required
                rows="5"
                value={newTicket.message}
                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Write complete issue details"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center gap-2">
                <Send className="w-4 h-4" />
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Your Tickets
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ticket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                />
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Loading tickets...</div>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${selectedTicketId === ticket.id ? 'bg-purple-50/50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{ticket.subject}</div>
                        <div className="text-xs text-slate-500 font-mono">{ticket.id}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_STYLES[normalize(ticket.priority)] || PRIORITY_STYLES.MEDIUM}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[normalize(ticket.status)] || STATUS_STYLES.OPEN}`}>
                        {String(ticket.status || 'OPEN').replace(/_/g, ' ')}
                      </span>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ticket.lastUpdate || 'Just now'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">No tickets found</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            {!selectedTicket ? (
              <div className="h-full p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <MessageSquare className="w-12 h-12 text-slate-300" />
                <p>Select a ticket to view conversation</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedTicket.id}</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedTicket.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {normalize(selectedTicket.status) !== 'CLOSED' && normalize(selectedTicket.status) !== 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleClose(selectedTicket.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Close
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedTicket.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                  {(selectedTicket.messages || []).length > 0 ? (
                    selectedTicket.messages.map((message) => {
                      const isMine = normalize(message.senderRole) === normalize(currentUser?.role || 'customer');
                      return (
                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-2xl px-4 py-3 border ${isMine ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                            <div className={`text-xs mb-1 ${isMine ? 'text-purple-100' : 'text-slate-500'}`}>
                              {message.senderName} ({String(message.senderRole || '').toUpperCase()})
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            <div className={`text-[11px] mt-2 ${isMine ? 'text-purple-100' : 'text-slate-500'}`}>
                              {message.createdLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-500 p-4">No messages yet.</div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-white">
                  {normalize(selectedTicket.status) === 'CLOSED' || normalize(selectedTicket.status) === 'RESOLVED' ? (
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      This ticket is closed. Create a new ticket for further support.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type your reply..."
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleReply();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleReply}
                        disabled={isReplying || !replyMessage.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 inline-flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {isReplying ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
