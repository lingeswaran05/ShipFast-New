import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useShipment } from '../../context/ShipmentContext';

const normalize = (value, fallback = '') => String(value || fallback).trim().toUpperCase().replace(/ /g, '_');

const STATUS_STYLES = {
  OPEN: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-slate-50 text-slate-700 border-slate-200'
};

export function AdminTicketsPanel() {
  const {
    currentUser,
    getAllSupportTickets,
    replySupportTicket,
    updateSupportTicketStatus,
    deleteSupportTicket
  } = useShipment();

  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const loadTickets = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const data = await getAllSupportTickets(statusFilter === 'ALL' ? '' : statusFilter);
      setTickets(data);
      if (data.length === 0) {
        setSelectedTicketId(null);
      } else if (!selectedTicketId || !data.some((ticket) => ticket.id === selectedTicketId)) {
        setSelectedTicketId(data[0].id);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load tickets');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets({ silent: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, selectedTicketId]);

  const filteredTickets = tickets.filter((ticket) => {
    const query = searchTerm.toLowerCase();
    if (!query) return true;
    return (
      String(ticket.subject || '').toLowerCase().includes(query) ||
      String(ticket.id || '').toLowerCase().includes(query) ||
      String(ticket.userId || '').toLowerCase().includes(query) ||
      String(ticket.category || '').toLowerCase().includes(query) ||
      String(ticket.messages?.[0]?.senderRole || '').toLowerCase().includes(query)
    );
  });

  const handleStatusChange = async (ticketId, status) => {
    try {
      const updated = await updateSupportTicketStatus(ticketId, status, {
        assignedToRole: 'ADMIN',
        assignedToUserId: currentUser?.userId || currentUser?.id || currentUser?.email
      });
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)));
      toast.success('Ticket status updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      setIsReplying(true);
      const updated = await replySupportTicket(selectedTicket.id, replyMessage.trim());
      setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      setReplyMessage('');
      toast.success('Reply sent');
    } catch (error) {
      toast.error(error.message || 'Failed to send reply');
    } finally {
      setIsReplying(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-slate-600">Handle both customer and agent conversations with admin</p>
        </div>
        <button
          onClick={() => loadTickets()}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-70 inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Tickets</h3>
            </div>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search subject / ticket / user"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-slate-500">Loading tickets...</div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedTicketId === ticket.id ? 'bg-indigo-50/60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-slate-900">{ticket.subject}</div>
                      <div className="text-xs text-slate-500 font-mono">{ticket.id}</div>
                      <div className="text-xs text-slate-500">Requester: {ticket.userId || 'N/A'}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[normalize(ticket.status)] || STATUS_STYLES.OPEN}`}>
                      {String(ticket.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Updated: {ticket.lastUpdate}</div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500">No tickets available.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {!selectedTicket ? (
            <div className="h-full flex items-center justify-center text-slate-500">Select a ticket to manage.</div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">{selectedTicket.subject}</h3>
                  <div className="text-xs text-slate-500 font-mono">{selectedTicket.id}</div>
                  <div className="text-xs text-slate-500 mt-1">Category: {selectedTicket.category} | Priority: {selectedTicket.priority}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={normalize(selectedTicket.status)}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedTicket.id)}
                    className="px-3 py-2 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto max-h-[440px] space-y-3">
                {(selectedTicket.messages || []).length > 0 ? (
                  selectedTicket.messages.map((message) => {
                    const senderRole = normalize(message.senderRole, 'ADMIN');
                    const isMine = senderRole === normalize(currentUser?.role, 'ADMIN');
                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-3 border ${isMine ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                          <div className={`text-xs mb-1 ${isMine ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {message.senderName} ({senderRole})
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <div className={`text-[11px] mt-2 ${isMine ? 'text-indigo-100' : 'text-slate-500'}`}>{message.createdLabel}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500">No conversation yet.</div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Reply to customer..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isReplying ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
