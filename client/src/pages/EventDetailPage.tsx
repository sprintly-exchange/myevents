import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, Send, Copy, Edit, ArrowLeft } from 'lucide-react';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Invitation } from '@/types';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const event = data?.event;
  const invitations: Invitation[] = data?.invitations || [];

  const sendInvitations = async () => {
    const emails = emailInput.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) { toast.error('Enter at least one email'); return; }
    setSending(true);
    try {
      const res = await api.post('/invitations', { event_id: id, emails, template_id: event?.template_id });
      toast.success(`Sent ${res.data.count} invitation(s)`);
      setEmailInput('');
      qc.invalidateQueries({ queryKey: ['event', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  const copyRsvpLink = (token: string) => {
    const url = `${window.location.origin}/rsvp/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('RSVP link copied!');
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <Badge variant="success">Accepted</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></AppLayout>;
  if (!event) return <AppLayout><div className="p-8 text-center text-gray-500">Event not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" />Back to Events
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            {event.description && <p className="text-gray-500 mt-1">{event.description}</p>}
          </div>
          <Link to={`/events/${id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Edit</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Date & Time</p>
                <p className="font-medium text-sm">{new Date(event.event_date).toLocaleString('sv-SE')}</p>
              </div>
            </CardContent>
          </Card>
          {event.location && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="font-medium text-sm">{event.location}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Guests</p>
                <p className="font-medium text-sm">{invitations.length} invited</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Send invitations */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Send Invitations</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="emails" className="sr-only">Emails</Label>
                <Input
                  id="emails"
                  placeholder="email1@example.com, email2@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                />
              </div>
              <Button onClick={sendInvitations} disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Separate multiple emails with commas</p>
          </CardContent>
        </Card>

        {/* Guest list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guest List ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No guests invited yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>RSVP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.recipient_email}</TableCell>
                      <TableCell>{inv.recipient_name || '—'}</TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(inv.sent_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => copyRsvpLink(inv.token)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
