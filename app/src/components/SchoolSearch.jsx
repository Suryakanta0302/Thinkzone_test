import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { apiRequest } from '../lib/api.js';
import { cacheSchools, getCachedSchools } from '../lib/offline-store.js';

export default function SchoolSearch({ online, onSelect }) {
  const [search, setSearch] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [blockCode, setBlockCode] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadMoreRef = useRef(null);
  const canLoadMore = items.length < total;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    async function loadSchools() {
      setLoading(true);
      setError('');
      const queryPage = page;
      try {
        if (online) {
          const params = new URLSearchParams({ page: String(queryPage), limit: '20', includeLocationCodes: 'true' });
          if (debouncedSearch) params.set('search', debouncedSearch);
          if (districtCode.trim()) params.set('districtCode', districtCode.trim());
          if (blockCode.trim()) params.set('blockCode', blockCode.trim());
          const result = await apiRequest(`/schools?${params}`);
          if (cancelled) return;
          await cacheSchools(result.items);
          setItems((previous) => queryPage === 1 ? result.items : [...previous, ...result.items]);
          setTotal(result.total);
        } else {
          const cached = await getCachedSchools();
          const normalizedSearch = debouncedSearch.toLocaleLowerCase();
          const filtered = cached.filter((school) =>
            (!districtCode || school.districtCode?.includes(districtCode.trim()))
            && (!blockCode || school.blockCode?.includes(blockCode.trim()))
            && (!normalizedSearch || school.schoolName?.toLocaleLowerCase().includes(normalizedSearch)
              || school.udiseCode?.startsWith(debouncedSearch)));
          if (cancelled) return;
          setItems(filtered.slice(0, 20 * queryPage));
          setTotal(filtered.length);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Schools could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSchools();
    return () => { cancelled = true; };
  }, [online, debouncedSearch, districtCode, blockCode, page]);

  useEffect(() => {
    if (!canLoadMore || loading || !loadMoreRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage((currentPage) => currentPage + 1);
    }, { rootMargin: '240px' });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, loading]);

  const emptyMessage = useMemo(() => online
    ? 'No schools match these filters.'
    : 'No matching schools are saved on this device yet.', [online]);

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
    setItems([]);
  }

  return (
    <Stack spacing={2.5}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">VISIT / 01</span>
          <Typography variant="h1">Select a school</Typography>
        </div>
        <Typography color="text.secondary">{total.toLocaleString()} schools</Typography>
      </div>
      <Paper className="filter-panel" variant="outlined">
        <TextField label="Search school or UDISE code" value={search} onChange={(event) => changeFilter(setSearch, event.target.value)} fullWidth />
        <TextField label="District code" value={districtCode} onChange={(event) => changeFilter(setDistrictCode, event.target.value)} />
        <TextField label="Block code" value={blockCode} onChange={(event) => changeFilter(setBlockCode, event.target.value)} />
      </Paper>
      {!online && <Alert severity="info">Offline mode: showing schools already loaded on this device.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <div className="school-list" aria-live="polite">
        {items.map((school) => (
          <Paper className="school-row" key={school.udiseCode} variant="outlined">
            <div className="school-copy">
              <Typography fontWeight={700}>{school.schoolName}</Typography>
              <Typography color="text.secondary" variant="body2">{school.udiseCode} · {school.blockName} · {school.clusterName}</Typography>
            </div>
            <Button variant="contained" onClick={() => onSelect(school)}>Visit</Button>
          </Paper>
        ))}
        {!loading && items.length === 0 && <Paper className="empty-state" variant="outlined"><Typography>{emptyMessage}</Typography></Paper>}
      </div>
      {loading && <div className="loading-row"><CircularProgress size={22} /><Typography color="text.secondary">Loading schools</Typography></div>}
      {canLoadMore && <div ref={loadMoreRef} className="load-more-sentinel" aria-hidden="true" />}
      {!loading && canLoadMore && <Button onClick={() => setPage((value) => value + 1)}>Load more schools</Button>}
    </Stack>
  );
}