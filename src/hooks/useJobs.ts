import { useState, useEffect } from 'react';
import { Job } from '../state/schema';
import { StateStore } from '../state/stateStore';
import { Messaging } from '../utils/messaging';

export function useJobs() {
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial jobs
    StateStore.getJobs().then((fetchedJobs) => {
      setJobs(fetchedJobs);
      setLoading(false);
    });

    // 2. Subscribe to storage changes
    const unsubscribe = StateStore.onChanged((changes) => {
      if (changes.jobs) {
        setJobs(changes.jobs.newValue || {});
      }
    });

    return unsubscribe;
  }, []);

  const saveJob = async (job: Job) => {
    await StateStore.saveJob(job);
  };

  const deleteJob = async (jobId: string) => {
    // Stop alarm scheduling first
    await Messaging.sendToBackground('JOB_DELETE', { jobId }).catch(() => {});
    await StateStore.deleteJob(jobId);
  };

  const startJob = async (jobId: string) => {
    await Messaging.sendToBackground('JOB_START', { jobId }).catch(() => {});
  };

  const stopJob = async (jobId: string) => {
    await Messaging.sendToBackground('JOB_STOP', { jobId }).catch(() => {});
  };

  const pauseJob = async (jobId: string) => {
    await Messaging.sendToBackground('JOB_PAUSE', { jobId }).catch(() => {});
  };

  const runJobNow = async (jobId: string) => {
    await Messaging.sendToBackground('RUN_JOB_NOW', { jobId }).catch(() => {});
  };

  const jobsList = Object.values(jobs).sort((a, b) => b.createdAt - a.createdAt);

  return {
    jobs,
    jobsList,
    loading,
    saveJob,
    deleteJob,
    startJob,
    stopJob,
    pauseJob,
    runJobNow,
  };
}
