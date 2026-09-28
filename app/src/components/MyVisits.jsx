import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { apiRequest } from '../lib/api.js';
import { getQueuedVisits, syncQueuedVisits } from '../lib/offline-store.js';
import { filterVisitsForUser } from '../lib/user-visits.js';

const PAGE_SIZE = 100;

function statusColor(status) {
  if (status === 'Synced') return 'success';
  if (status === 'Failed') return 'error';
  return 'warning';
}

export default function MyVisits({ user, online, refreshKey }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [remotePage, setRemotePage] = useState(0);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const loadMoreRef = useRef(null);
  const canLoadMore = online && remotePage * PAGE_SIZE < remoteTotal;

  function mergeVisits(current, incoming) {
    const byId = new Map(filterVisitsForUser(current, user.userId).map((visit) => [visit.clientId, visit]));
    for (const visit of incoming) {
      if (visit.userId === user.userId) byId.set(visit.clientId, visit);
    }
    return [...byId.values()].sort((a, b) => new Date(b.visitedAt) - new Date(a.visitedAt));
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    setVisits([]);
    try {
      if (navigator.onLine) await syncQueuedVisits();
      const local = await getQueuedVisits(user.userId);
      if (navigator.onLine) {
        const result = await apiRequest(`/visits?userId=${encodeURIComponent(user.userId)}&page=1&limit=${PAGE_SIZE}`);
        const remote = result.items.map((visit) => ({ ...visit, status: 'Synced' }));
        setVisits(mergeVisits(local, remote));
        setRemotePage(1);
        setRemoteTotal(result.total);
      } else {
        setVisits(mergeVisits([], local));
        setRemotePage(0);
        setRemoteTotal(0);
      }
    } catch (loadError) {
      setError(loadError.message || 'Visits could not be loaded from the server.');
      setVisits(mergeVisits([], await getQueuedVisits(user.userId)));
      setRemotePage(0);
      setRemoteTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user.userId]);

  const loadMore = useCallback(async () => {
    if (!canLoadMore || loading || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = remotePage + 1;
      const result = await apiRequest(`/visits?userId=${encodeURIComponent(user.userId)}&page=${nextPage}&limit=${PAGE_SIZE}`);
      setVisits((current) => mergeVisits(current, result.items.map((visit) => ({ ...visit, status: 'Synced' }))));
      setRemotePage(nextPage);
      setRemoteTotal(result.total);
    } catch (loadError) {
      setError(loadError.message || 'More visits could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  }, [canLoadMore, loading, loadingMore, remotePage, user.userId]);

  useEffect(() => { refresh(); }, [refresh, online, refreshKey]);

  useEffect(() => {
    if (!canLoadMore || loading || loadingMore || !loadMoreRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: '240px' });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, loading, loadingMore, loadMore]);

  return (
    <Stack spacing={2.5}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ACTIVITY / {user.userName.toUpperCase()}</span>
          <Typography variant="h1">My visits</Typography>
        </div>
        <Typography color="text.secondary">{visits.length} records</Typography>
      </div>
      {!online && <Alert severity="info">Offline. Showing visits saved on this device.</Alert>}
      {error && online && <Alert severity="warning">{error} Local visits are still shown below.</Alert>}
      {loading && <div className="loading-row"><CircularProgress size={22} /><Typography color="text.secondary">Refreshing visits</Typography></div>}
      {!loading && visits.length === 0 && <Paper className="empty-state" variant="outlined"><Typography>No visits recorded yet.</Typography></Paper>}
      {visits.map((visit) => (
        <Paper className="visit-row" key={visit.clientId} variant="outlined">
          <div className="visit-copy">
            <Typography fontWeight={700}>{visit.schoolName ?? visit.udiseCode}</Typography>
            <Typography color="text.secondary" variant="body2">{new Date(visit.visitedAt).toLocaleString()} · {visit.clientId}</Typography>
            {visit.failureReason && <Typography color="error" variant="body2">{visit.failureReason}</Typography>}
          </div>
          <div className="visit-badges">
            <Chip size="small" color={statusColor(visit.status)} label={visit.status} />
            <Chip size="small" variant="outlined" label={visit.captureMode === 'offline' ? 'Captured offline' : 'Captured online'} />
          </div>
        </Paper>
      ))}
      {canLoadMore && <div ref={loadMoreRef} className="load-more-sentinel" aria-hidden="true" />}
      {loadingMore && <div className="loading-row"><CircularProgress size={22} /><Typography color="text.secondary">Loading more visits</Typography></div>}
      {!loadingMore && canLoadMore && <Button onClick={loadMore}>Load more visits</Button>}
    </Stack>
  );
}