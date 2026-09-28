import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { apiRequest } from '../lib/api.js';
import { cacheQuestionnaire, getCachedQuestionnaire, saveQueuedVisit, syncQueuedVisits } from '../lib/offline-store.js';
import { getCurrentIndiaMonth, sameMonth } from '../lib/month.js';
import { createClientId } from '../lib/client-id.js';

function getInputValue(question, rawValue) {
  if (question.type === 'number') return rawValue === '' ? '' : Number(rawValue);
  return rawValue;
}

export default function VisitForm({ school, user, online, onDone, onBack }) {
  const [questionnaire, setQuestionnaire] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentMonth = useMemo(() => getCurrentIndiaMonth(), []);

  useEffect(() => {
    let cancelled = false;
    async function loadQuestionnaire() {
      setLoading(true);
      setError('');
      try {
        let saved;
        if (online) {
          saved = await apiRequest('/questionnaires/current');
          await cacheQuestionnaire(saved);
        } else {
          saved = await getCachedQuestionnaire();
        }
        if (!saved || !sameMonth(saved, currentMonth)) {
          throw new Error('Go online to download this month’s questionnaire before recording a visit.');
        }
        if (!cancelled) setQuestionnaire(saved);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Questionnaire could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadQuestionnaire();
    return () => { cancelled = true; };
  }, [online, currentMonth]);

  function updateAnswer(question, rawValue) {
    setAnswers((previous) => ({ ...previous, [question.questionId]: getInputValue(question, rawValue) }));
  }

  function validate() {
    for (const question of questionnaire.questions) {
      const value = answers[question.questionId];
      if (value === undefined || value === '' || (typeof value === 'string' && !value.trim())) {
        if (!question.optional) return `${question.text} is required.`;
        continue;
      }
      if (question.type === 'number' && (!Number.isInteger(value) || value < question.min || value > question.max)) {
        return `Enter a whole number from ${question.min} to ${question.max} for “${question.text}”.`;
      }
      if (question.type === 'text' && value.length > question.maxLength) {
        return `Keep “${question.text}” within ${question.maxLength} characters.`;
      }
    }
    return '';
  }

  async function submitVisit(event) {
    event.preventDefault();
    if (!questionnaire) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    const visit = {
      clientId: createClientId(),
      captureMode: navigator.onLine ? 'online' : 'offline',
      userId: user.userId,
      udiseCode: school.udiseCode,
      visitedAt: new Date().toISOString(),
      answers: questionnaire.questions
        .filter((question) => answers[question.questionId] !== undefined && answers[question.questionId] !== '')
        .map((question) => ({ questionId: question.questionId, value: answers[question.questionId] })),
    };
    try {
      await saveQueuedVisit(visit);
      if (navigator.onLine) await syncQueuedVisits();
      onDone();
    } catch (saveError) {
      setError(`Could not save this visit on the device: ${saveError.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={submitVisit}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">VISIT / 02 · {questionnaire?.title ?? 'QUESTIONNAIRE'}</span>
          <Typography variant="h1">Visit details</Typography>
          <Typography color="text.secondary">{school.schoolName} · {school.udiseCode}</Typography>
        </div>
        <Button onClick={onBack}>Change school</Button>
      </div>
      {!online && <Alert severity="info">Offline. This visit will be saved on this device and sent when the network returns.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Typography color="text.secondary">Loading questionnaire…</Typography>}
      {!loading && questionnaire?.questions.map((question) => (
        <FormControl className="question-row" key={question.questionId} required={!question.optional}>
          <FormLabel>{question.text}{question.optional ? ' (optional)' : ''}</FormLabel>
          {question.type === 'yesNo' && (
            <RadioGroup row value={answers[question.questionId] ?? ''} onChange={(event) => updateAnswer(question, event.target.value === 'true')}>
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          )}
          {question.type === 'singleChoice' && (
            <RadioGroup value={answers[question.questionId] ?? ''} onChange={(event) => updateAnswer(question, event.target.value)}>
              {question.options.map((option) => <FormControlLabel key={option} value={option} control={<Radio />} label={option} />)}
            </RadioGroup>
          )}
          {question.type === 'number' && (
            <TextField type="number" value={answers[question.questionId] ?? ''} onChange={(event) => updateAnswer(question, event.target.value)} inputProps={{ min: question.min, max: question.max, step: 1 }} />
          )}
          {question.type === 'text' && (
            <TextField multiline minRows={2} value={answers[question.questionId] ?? ''} onChange={(event) => updateAnswer(question, event.target.value)} inputProps={{ maxLength: question.maxLength }} helperText={`${(answers[question.questionId] ?? '').length}/${question.maxLength}`} />
          )}
        </FormControl>
      ))}
      {!loading && questionnaire && <div className="form-actions"><Button onClick={onBack}>Cancel</Button><Button type="submit" variant="contained" disabled={submitting}>{submitting ? 'Saving…' : 'Save visit'}</Button></div>}
    </Stack>
  );
}