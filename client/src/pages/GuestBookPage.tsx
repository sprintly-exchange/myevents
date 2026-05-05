import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, X, Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Contact, ContactGroup } from '@/types';

type Tab = 'contacts' | 'groups';

export default function GuestBookPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('contacts');
  const [search, setSearch] = useState('');

  const [showAddContact, setShowAddContact] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editGroup, setEditGroup] = useState<ContactGroup | null>(null);
  const [gName, setGName] = useState('');
  const [managingGroup, setManagingGroup] = useState<ContactGroup | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then(r => r.data),
  });
  const { data: groupsData } = useQuery({
    queryKey: ['contact-groups'],
    queryFn: () => api.get('/contacts/groups').then(r => r.data),
  });

  const contacts: Contact[] = contactsData?.contacts || [];
  const groups: ContactGroup[] = groupsData?.groups || [];

  const filteredContacts = contacts.filter(c =>
    [c.name, c.email, c.phone || ''].some(value => value.toLowerCase().includes(search.toLowerCase()))
  );

  const addContactMut = useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string }) => api.post('/contacts', data),
    onSuccess: () => {
      toast.success(t('guestBook.contactAdded'));
      qc.invalidateQueries({ queryKey: ['contacts'] });
      resetContactForm();
    },
    onError: () => toast.error(t('guestBook.errorAddContact')),
  });
  const updateContactMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; phone?: string } }) => api.patch(`/contacts/${id}`, data),
    onSuccess: () => {
      toast.success(t('guestBook.contactUpdated'));
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setEditContact(null);
    },
    onError: () => toast.error(t('guestBook.errorUpdateContact')),
  });
  const deleteContactMut = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      toast.success(t('guestBook.contactDeleted'));
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-groups'] });
      setDeletingContactId(null);
    },
    onError: () => toast.error(t('guestBook.errorDeleteContact')),
  });
  const addGroupMut = useMutation({
    mutationFn: (data: { name: string }) => api.post('/contacts/groups', data),
    onSuccess: () => {
      toast.success(t('guestBook.groupAdded'));
      qc.invalidateQueries({ queryKey: ['contact-groups'] });
      setShowAddGroup(false);
      setGName('');
    },
    onError: () => toast.error(t('guestBook.errorAddGroup')),
  });
  const updateGroupMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) => api.patch(`/contacts/groups/${id}`, data),
    onSuccess: () => {
      toast.success(t('guestBook.groupUpdated'));
      qc.invalidateQueries({ queryKey: ['contact-groups'] });
      setEditGroup(null);
    },
    onError: () => toast.error(t('guestBook.errorUpdateGroup')),
  });
  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/groups/${id}`),
    onSuccess: () => {
      toast.success(t('guestBook.groupDeleted'));
      qc.invalidateQueries({ queryKey: ['contact-groups'] });
      setDeletingGroupId(null);
    },
    onError: () => toast.error(t('guestBook.errorDeleteGroup')),
  });
  const addMembersMut = useMutation({
    mutationFn: ({ groupId, contact_ids }: { groupId: string; contact_ids: string[] }) =>
      api.post(`/contacts/groups/${groupId}/members`, { contact_ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-groups'] });
    },
    onError: () => toast.error(t('guestBook.errorUpdateGroup')),
  });
  const removeMemberMut = useMutation({
    mutationFn: ({ groupId, contactId }: { groupId: string; contactId: string }) =>
      api.delete(`/contacts/groups/${groupId}/members/${contactId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-groups'] });
    },
    onError: () => toast.error(t('guestBook.errorUpdateGroup')),
  });

  function resetContactForm() {
    setShowAddContact(false);
    setCName('');
    setCEmail('');
    setCPhone('');
  }

  function openEditContact(contact: Contact) {
    setEditContact(contact);
    setCName(contact.name);
    setCEmail(contact.email);
    setCPhone(contact.phone || '');
  }

  function toggleExpand(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('guestBook.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('guestBook.subtitle')}</p>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {(['contacts', 'groups'] as Tab[]).map(key => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t(`guestBook.${key}`)}
              <span className="ml-2 text-xs text-slate-400">
                ({key === 'contacts' ? contacts.length : groups.length})
              </span>
            </button>
          ))}
        </div>

        {tab === 'contacts' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('guestBook.searchContacts')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 border-slate-200"
                />
              </div>
              <Button onClick={() => setShowAddContact(true)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
                <Plus className="h-4 w-4 mr-1.5" />
                {t('guestBook.addContact')}
              </Button>
            </div>

            {showAddContact && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-blue-900 mb-3">{t('guestBook.addContact')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <Input placeholder={`${t('common.name')} *`} value={cName} onChange={e => setCName(e.target.value)} className="border-slate-200" />
                  <Input type="email" placeholder={`${t('common.email')} *`} value={cEmail} onChange={e => setCEmail(e.target.value)} className="border-slate-200" />
                  <PhoneInput value={cPhone} onChange={setCPhone} placeholder={t('invitations.phonePlaceholder')} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={resetContactForm}>{t('common.cancel')}</Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!cName || !cEmail || addContactMut.isPending}
                    onClick={() => addContactMut.mutate({ name: cName, email: cEmail, phone: cPhone })}
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {filteredContacts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 flex flex-col items-center py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">{t('guestBook.noContacts')}</h3>
                <p className="text-sm text-slate-400">{t('guestBook.noContactsSubtitle')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/70 divide-y divide-slate-100">
                {filteredContacts.map(contact => (
                  <div key={contact.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{contact.name}</p>
                      <p className="text-xs text-slate-400">{contact.email}{contact.phone ? ` · ${contact.phone}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {deletingContactId === contact.id ? (
                        <>
                          <span className="text-xs text-red-600 font-medium">{t('guestBook.deleteContactConfirm')}</span>
                          <button onClick={() => deleteContactMut.mutate(contact.id)} className="text-red-500 hover:text-red-700">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeletingContactId(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEditContact(contact)} className="text-slate-300 hover:text-blue-500 transition-colors" title={t('guestBook.editContact')}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeletingContactId(contact.id)} className="text-slate-300 hover:text-red-500 transition-colors" title={t('guestBook.deleteContact')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'groups' && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setShowAddGroup(true); setGName(''); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1.5" />
                {t('guestBook.addGroup')}
              </Button>
            </div>

            {groups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 flex flex-col items-center py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">{t('guestBook.noGroups')}</h3>
                <p className="text-sm text-slate-400">{t('guestBook.noGroupsSubtitle')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/70 divide-y divide-slate-100">
                {groups.map(group => (
                  <div key={group.id}>
                    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => toggleExpand(group.id)}>
                        {expandedGroups.has(group.id)
                          ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{group.name}</p>
                          <Badge variant="secondary" className="mt-1">{t('guestBook.members', { count: group.members.length })}</Badge>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setManagingGroup(group)}>
                          {t('guestBook.manageMembers')}
                        </Button>
                        {deletingGroupId === group.id ? (
                          <>
                            <button onClick={() => deleteGroupMut.mutate(group.id)} className="text-red-500 hover:text-red-700">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeletingGroupId(null)} className="text-slate-400 hover:text-slate-600">
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditGroup(group); setGName(group.name); }} className="text-slate-300 hover:text-blue-500 transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeletingGroupId(group.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {expandedGroups.has(group.id) && (
                      <div className="bg-slate-50 px-5 pb-3 pt-1">
                        {group.members.length === 0 ? (
                          <p className="py-2 text-sm text-slate-400">{t('guestBook.noContacts')}</p>
                        ) : (
                          group.members.map(member => (
                            <div key={member.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                              <div>
                                <span className="text-sm text-slate-700 font-medium">{member.name}</span>
                                <span className="text-xs text-slate-400 ml-2">{member.email}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">{t('guestBook.editContact')}</h3>
              <button onClick={() => setEditContact(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('common.name')}</label>
                <Input value={cName} onChange={e => setCName(e.target.value)} className="border-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('common.email')}</label>
                <Input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} className="border-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('invitations.phone')}</label>
                <PhoneInput value={cPhone} onChange={setCPhone} placeholder={t('invitations.phonePlaceholder')} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setEditContact(null)}>{t('common.cancel')}</Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={updateContactMut.isPending}
                onClick={() => updateContactMut.mutate({ id: editContact.id, data: { name: cName, email: cEmail, phone: cPhone } })}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">{t('guestBook.addGroup')}</h3>
              <button onClick={() => setShowAddGroup(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guestBook.groupName')}</label>
              <Input
                placeholder={t('guestBook.groupNamePlaceholder')}
                value={gName}
                onChange={e => setGName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && gName && addGroupMut.mutate({ name: gName })}
                className="border-slate-200"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddGroup(false)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!gName || addGroupMut.isPending} onClick={() => addGroupMut.mutate({ name: gName })}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">{t('guestBook.groupName')}</h3>
              <button onClick={() => setEditGroup(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-4">
              <Input value={gName} onChange={e => setGName(e.target.value)} className="border-slate-200" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditGroup(null)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!gName || updateGroupMut.isPending} onClick={() => updateGroupMut.mutate({ id: editGroup.id, data: { name: gName } })}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {managingGroup && (
        <ManageMembersModal
          group={managingGroup}
          allContacts={contacts}
          onClose={() => setManagingGroup(null)}
          onAdd={contactIds => addMembersMut.mutate({ groupId: managingGroup.id, contact_ids: contactIds })}
          onRemove={contactId => removeMemberMut.mutate({ groupId: managingGroup.id, contactId })}
          t={t}
          groups={groups}
        />
      )}
    </AppLayout>
  );
}

function ManageMembersModal({
  group,
  allContacts,
  onClose,
  onAdd,
  onRemove,
  t,
  groups,
}: {
  group: ContactGroup;
  allContacts: Contact[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  onRemove: (id: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  groups: ContactGroup[];
}) {
  const latestGroup = groups.find(item => item.id === group.id) || group;
  const memberIds = new Set(latestGroup.members.map(member => member.id));
  const available = allContacts.filter(contact => !memberIds.has(contact.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filteredAvailable = available.filter(contact =>
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    contact.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-semibold text-slate-900">{latestGroup.name} — {t('guestBook.manageMembers')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        {latestGroup.members.length > 0 && (
          <div className="mb-4 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('guestBook.currentMembers')}</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {latestGroup.members.map(member => (
                <div key={member.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-slate-800">{member.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{member.email}</span>
                  </div>
                  <button onClick={() => onRemove(member.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {available.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 shrink-0">{t('guestBook.addContacts')}</p>
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder={t('guestBook.searchContacts')} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm border-slate-200" />
            </div>
            <div className="overflow-y-auto flex-1 space-y-1">
              {filteredAvailable.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => toggle(contact.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border',
                    selected.has(contact.id) ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-slate-50'
                  )}
                >
                  <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', selected.has(contact.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
                    {selected.has(contact.id) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-800">{contact.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{contact.email}</span>
                  </div>
                </div>
              ))}
            </div>
            {selected.size > 0 && (
              <Button
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 shrink-0"
                onClick={() => {
                  onAdd(Array.from(selected));
                  setSelected(new Set());
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t('guestBook.addSelected', { count: selected.size })}
              </Button>
            )}
          </div>
        )}

        {available.length === 0 && latestGroup.members.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">{t('guestBook.noContacts')}</p>
        )}
      </div>
    </div>
  );
}
