'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  UserCheck, 
  Clock,
  Users,
  Search,
  X
} from 'lucide-react';

interface UserApproval {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      // Check if user is admin
      if (user.email !== 'chinwen.ao@gmail.com') {
        router.replace('/');
        return;
      }
      
      setIsAdmin(true);
      await loadApprovals();
    }

    checkAdminAndLoad();
  }, [router]);

  async function loadApprovals() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_approvals')
      .select('*')
      .order('requested_at', { ascending: false });

    if (!error && data) {
      setApprovals(data as UserApproval[]);
    }
    setIsLoading(false);
  }

  async function handleApprove(userId: string) {
    setProcessingId(userId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setProcessingId(null);
      return;
    }

    const { error } = await supabase
      .from('user_approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (!error) {
      await loadApprovals();
    }
    setProcessingId(null);
  }

  async function handleReject(userId: string) {
    if (!rejectReason.trim()) return;

    setProcessingId(userId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setProcessingId(null);
      return;
    }

    const { error } = await supabase
      .from('user_approvals')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: rejectReason,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (!error) {
      setRejectingId(null);
      setRejectReason('');
      await loadApprovals();
    }
    setProcessingId(null);
  }

  const filteredApprovals = approvals.filter((approval) => {
    const matchesFilter = filter === 'all' || approval.status === filter;
    const matchesSearch = approval.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: approvals.length,
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4a7c59]" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2e3230] font-['Literata',serif] mb-2">
          User Approvals
        </h1>
        <p className="text-[#78716c]">
          Manage user access requests and approve or reject new accounts.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[rgba(196,200,188,0.5)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f5f1ea] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#4a7c59]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2e3230]">{stats.total}</p>
              <p className="text-xs text-[#78716c]">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[rgba(196,200,188,0.5)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2e3230]">{stats.pending}</p>
              <p className="text-xs text-[#78716c]">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[rgba(196,200,188,0.5)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2e3230]">{stats.approved}</p>
              <p className="text-xs text-[#78716c]">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[rgba(196,200,188,0.5)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2e3230]">{stats.rejected}</p>
              <p className="text-xs text-[#78716c]">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[rgba(196,200,188,0.5)] mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#4a7c59] text-white'
                    : 'bg-[#f5f1ea] text-[#4a4e4a] hover:bg-[#ebe6de]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716c]" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[rgba(196,200,188,0.5)] bg-[#faf6f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40"
            />
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-xl shadow-sm border border-[rgba(196,200,188,0.5)] overflow-hidden">
        {filteredApprovals.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-[#c4c8bc] mx-auto mb-4" />
            <p className="text-[#78716c]">No users found matching your criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(196,200,188,0.3)]">
            {filteredApprovals.map((approval) => (
              <div key={approval.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    approval.status === 'approved' ? 'bg-green-100' :
                    approval.status === 'rejected' ? 'bg-red-100' :
                    'bg-amber-100'
                  }`}>
                    {approval.status === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : approval.status === 'rejected' ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#2e3230]">{approval.email}</p>
                    <p className="text-sm text-[#78716c]">
                      Requested {new Date(approval.requested_at).toLocaleDateString()}
                      {approval.status === 'approved' && approval.approved_at && (
                        <> · Approved {new Date(approval.approved_at).toLocaleDateString()}</>
                      )}
                      {approval.status === 'rejected' && approval.rejected_at && (
                        <> · Rejected {new Date(approval.rejected_at).toLocaleDateString()}</>
                      )}
                    </p>
                    {approval.rejection_reason && (
                      <p className="text-sm text-red-600 mt-1">
                        Reason: {approval.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {approval.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(approval.user_id)}
                        disabled={processingId === approval.user_id}
                        className="flex items-center gap-2 px-4 py-2 bg-[#4a7c59] hover:bg-[#3f664a] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(approval.user_id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {approval.status === 'approved' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Approved
                    </span>
                  )}
                  {approval.status === 'rejected' && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2e3230]">Reject User</h3>
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="p-1 hover:bg-[#f5f1ea] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#78716c]" />
              </button>
            </div>
            <p className="text-[#78716c] mb-4">
              Please provide a reason for rejecting this user. They will see this message.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-3 rounded-xl border border-[rgba(196,200,188,0.5)] bg-[#faf6f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/40 mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 bg-[#f5f1ea] hover:bg-[#ebe6de] text-[#4a4e4a] rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Reject User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
