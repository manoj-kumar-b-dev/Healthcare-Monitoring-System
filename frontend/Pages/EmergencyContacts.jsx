import React, { useState, useEffect } from 'react';
import { Phone, Mail, User, Trash2, Edit2, Plus, Users, X } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const inputCls = 'w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm';

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', relationship: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.contacts.getAll();
      setContacts(res.data.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.contacts.update(editingId, formData);
        toast.success('Contact updated successfully');
      } else {
        await api.contacts.create(formData);
        toast.success('Contact added successfully');
      }
      setIsModalOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this emergency contact?')) {
      try {
        await api.contacts.delete(id);
        toast.success('Contact removed');
        fetchContacts();
      } catch (error) {
        toast.error('Failed to delete contact');
      }
    }
  };

  const openEditModal = (contact) => {
    setFormData({ name: contact.name, phone: contact.phone, email: contact.email, relationship: contact.relationship });
    setEditingId(contact._id);
    setIsModalOpen(true);
  };

  const resetForm = () => { setFormData({ name: '', phone: '', email: '', relationship: '' }); setEditingId(null); };

  const relationshipColors = ['bg-blue-50 text-blue-700 border-blue-100', 'bg-teal-50 text-teal-700 border-teal-100', 'bg-purple-50 text-purple-700 border-purple-100', 'bg-emerald-50 text-emerald-700 border-emerald-100'];

  return (
    <div className="max-w-4xl mx-auto py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Emergency Contacts</h1>
          <p className="text-slate-500 text-sm mt-1">People to notify in case of health emergencies.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/30"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-500 opacity-70" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Contacts Yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Add people we can notify in case of an emergency with your vitals and location.
          </p>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="text-blue-600 font-bold hover:underline text-sm"
          >
            Add your first contact →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {contacts.map((contact, idx) => (
            <div
              key={contact._id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative group"
            >
              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => openEditModal(contact)}
                  aria-label="Edit contact"
                  className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(contact._id)}
                  aria-label="Delete contact"
                  className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Contact info */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-extrabold text-white text-lg shadow shrink-0">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{contact.name}</h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${relationshipColors[idx % relationshipColors.length]}`}>
                    {contact.relationship || 'Contact'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium">{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit Contact' : 'Add Emergency Contact'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required name="name" value={formData.name} onChange={handleInputChange} type="text" className={inputCls} placeholder="Jane Doe" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className={inputCls} placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address <span className="normal-case font-normal text-slate-400">(Optional)</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="email" value={formData.email} onChange={handleInputChange} type="email" className={inputCls} placeholder="jane@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Relationship</label>
                <input required name="relationship" value={formData.relationship} onChange={handleInputChange} type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Spouse, Parent, Friend, etc." />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-blue-200">
                  {editingId ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;
