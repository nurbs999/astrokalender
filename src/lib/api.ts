import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Photo, Vote, Voter, PhotoVoteSummary, VoterStats, Rating } from '../types';
import { INITIAL_PHOTOS } from './mockData';

// Local storage keys
const LS_PHOTOS_KEY = 'astrovote_photos_v1';
const LS_VOTES_KEY = 'astrovote_votes_v1';
const LS_VOTERS_KEY = 'astrovote_voters_v1';
const LS_SUPABASE_CONFIG_KEY = 'astrovote_supabase_config_v1';

// Read config from environment variables if set at build time, else from localStorage
export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  try {
    const stored = localStorage.getItem(LS_SUPABASE_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading stored Supabase config:', e);
  }

  return { url: '', anonKey: '' };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  if (!url || !anonKey) {
    localStorage.removeItem(LS_SUPABASE_CONFIG_KEY);
  } else {
    localStorage.setItem(LS_SUPABASE_CONFIG_KEY, JSON.stringify({ url, anonKey }));
  }
  supabaseInstance = null; // reset cached client
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getStoredSupabaseConfig();
  if (url && anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return null;
}

export function isUsingLiveSupabase(): boolean {
  return getSupabaseClient() !== null;
}

// ==========================================
// LOCAL STORAGE HELPER FALLBACKS
// ==========================================
function getLocalPhotos(): Photo[] {
  try {
    const raw = localStorage.getItem(LS_PHOTOS_KEY);
    if (!raw) {
      localStorage.setItem(LS_PHOTOS_KEY, JSON.stringify(INITIAL_PHOTOS));
      return INITIAL_PHOTOS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PHOTOS;
  }
}

function saveLocalPhotos(photos: Photo[]) {
  localStorage.setItem(LS_PHOTOS_KEY, JSON.stringify(photos));
}

function getLocalVotes(): Vote[] {
  try {
    const raw = localStorage.getItem(LS_VOTES_KEY);
    if (!raw) {
      // Seed some demo votes so the ranking & diagrams are immediately visible in demo mode
      const seedVotes: Vote[] = [
        { photo_id: 'photo-1', voter_email: 'demo1@astro.de', rating: 'up', suggested_month: 10, updated_at: new Date().toISOString() },
        { photo_id: 'photo-1', voter_email: 'demo2@astro.de', rating: 'up', suggested_month: 10, updated_at: new Date().toISOString() },
        { photo_id: 'photo-1', voter_email: 'demo3@astro.de', rating: 'up', suggested_month: 11, updated_at: new Date().toISOString() },
        { photo_id: 'photo-2', voter_email: 'demo1@astro.de', rating: 'up', suggested_month: 1, updated_at: new Date().toISOString() },
        { photo_id: 'photo-2', voter_email: 'demo2@astro.de', rating: 'up', suggested_month: 1, updated_at: new Date().toISOString() },
        { photo_id: 'photo-2', voter_email: 'demo4@astro.de', rating: 'down', suggested_month: null, updated_at: new Date().toISOString() },
        { photo_id: 'photo-3', voter_email: 'demo1@astro.de', rating: 'up', suggested_month: 11, updated_at: new Date().toISOString() },
        { photo_id: 'photo-3', voter_email: 'demo3@astro.de', rating: 'up', suggested_month: 12, updated_at: new Date().toISOString() },
        { photo_id: 'photo-4', voter_email: 'demo2@astro.de', rating: 'up', suggested_month: 7, updated_at: new Date().toISOString() },
        { photo_id: 'photo-4', voter_email: 'demo3@astro.de', rating: 'up', suggested_month: 8, updated_at: new Date().toISOString() },
        { photo_id: 'photo-5', voter_email: 'demo1@astro.de', rating: 'up', suggested_month: 9, updated_at: new Date().toISOString() },
        { photo_id: 'photo-6', voter_email: 'demo2@astro.de', rating: 'up', suggested_month: 2, updated_at: new Date().toISOString() },
      ];
      localStorage.setItem(LS_VOTES_KEY, JSON.stringify(seedVotes));
      return seedVotes;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalVotes(votes: Vote[]) {
  localStorage.setItem(LS_VOTES_KEY, JSON.stringify(votes));
}

function getLocalVoters(): Voter[] {
  try {
    const raw = localStorage.getItem(LS_VOTERS_KEY);
    if (!raw) {
      const seedVoters: Voter[] = [
        { email: 'demo1@astro.de', name: 'Dr. Anna Stern', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
        { email: 'demo2@astro.de', name: 'Felix Kosmos', created_at: new Date(Date.now() - 3600000 * 18).toISOString() },
        { email: 'demo3@astro.de', name: 'Laura Orion', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
        { email: 'demo4@astro.de', name: 'Klaus Nebel', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
      ];
      localStorage.setItem(LS_VOTERS_KEY, JSON.stringify(seedVoters));
      return seedVoters;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalVoters(voters: Voter[]) {
  localStorage.setItem(LS_VOTERS_KEY, JSON.stringify(voters));
}

// ==========================================
// UNIFIED API METHODS
// ==========================================

export async function fetchPhotos(): Promise<Photo[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // When connected to Supabase, return actual database records
      return (data || []) as Photo[];
    } catch (err) {
      console.warn('Supabase fetchPhotos error, falling back to local:', err);
    }
  }
  return getLocalPhotos();
}

export async function seedDemoPhotosToSupabase(): Promise<Photo[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase ist nicht verbunden');

  const photosToInsert = INITIAL_PHOTOS.map(p => ({
    title: p.title,
    author: p.author,
    image_url: p.image_url,
    telescope: p.telescope || null,
    exposure: p.exposure || null,
    description: p.description || null,
  }));

  const { data, error } = await client
    .from('photos')
    .insert(photosToInsert)
    .select();

  if (error) throw new Error(`Fehler beim Einfügen in Supabase: ${error.message}`);
  return (data || []) as Photo[];
}

export async function uploadPhoto(
  compressedBlob: Blob,
  fileName: string,
  meta: {
    title: string;
    author: string;
    telescope?: string;
    exposure?: string;
    description?: string;
  }
): Promise<Photo> {
  const client = getSupabaseClient();

  if (client) {
    // 1. Upload to Supabase Storage Bucket 'photos'
    const cleanName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error: uploadError } = await client.storage
      .from('photos')
      .upload(cleanName, compressedBlob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Upload zum Storage fehlgeschlagen: ${uploadError.message}`);
    }

    // 2. Get Public URL
    const { data: publicUrlData } = client.storage
      .from('photos')
      .getPublicUrl(cleanName);

    const imageUrl = publicUrlData.publicUrl;

    // 3. Insert record in photos table
    const { data: newPhoto, error: insertError } = await client
      .from('photos')
      .insert({
        title: meta.title,
        author: meta.author,
        image_url: imageUrl,
        telescope: meta.telescope || null,
        exposure: meta.exposure || null,
        description: meta.description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Datenbankeintrag fehlgeschlagen: ${insertError.message}`);
    }

    return newPhoto as Photo;
  }

  // Local storage mode: convert blob to data URL and persist locally
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const newPhoto: Photo = {
        id: `photo-${Date.now()}`,
        title: meta.title,
        author: meta.author,
        image_url: dataUrl,
        telescope: meta.telescope,
        exposure: meta.exposure,
        description: meta.description,
        created_at: new Date().toISOString()
      };

      const existing = getLocalPhotos();
      const updated = [newPhoto, ...existing];
      saveLocalPhotos(updated);
      resolve(newPhoto);
    };
    reader.readAsDataURL(compressedBlob);
  });
}

export async function updatePhoto(id: string, updates: Partial<Photo>): Promise<Photo> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Photo;
  }

  const photos = getLocalPhotos();
  const index = photos.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Foto nicht gefunden');

  const updated = { ...photos[index], ...updates };
  photos[index] = updated;
  saveLocalPhotos(photos);
  return updated;
}

export async function deletePhoto(id: string, imageUrl?: string): Promise<void> {
  const client = getSupabaseClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (client && isUUID) {
    // If image is in Supabase storage, attempt delete
    if (imageUrl && imageUrl.includes('/photos/')) {
      const parts = imageUrl.split('/photos/');
      if (parts[1]) {
        await client.storage.from('photos').remove([parts[1]]);
      }
    }

    const { error } = await client
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // Always clean up local mock/demo data if matching
  const photos = getLocalPhotos().filter(p => p.id !== id);
  saveLocalPhotos(photos);

  // also remove votes for this photo locally
  const votes = getLocalVotes().filter(v => v.photo_id !== id);
  saveLocalVotes(votes);
}

export async function fetchUserVotes(voterEmail: string): Promise<Record<string, Vote>> {
  if (!voterEmail) return {};
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('votes')
        .select('*')
        .eq('voter_email', voterEmail.toLowerCase().trim());

      if (error) throw error;
      const map: Record<string, Vote> = {};
      (data as Vote[]).forEach(v => {
        map[v.photo_id] = v;
      });
      return map;
    } catch (err) {
      console.warn('Error fetching user votes from Supabase:', err);
    }
  }

  const localVotes = getLocalVotes();
  const userVotes = localVotes.filter(v => v.voter_email.toLowerCase().trim() === voterEmail.toLowerCase().trim());
  const map: Record<string, Vote> = {};
  userVotes.forEach(v => {
    map[v.photo_id] = v;
  });
  return map;
}

export async function saveVote(params: {
  voter_email: string;
  voter_name: string;
  photo_id: string;
  rating: Rating;
  suggested_month: number | null;
}): Promise<Vote> {
  const email = params.voter_email.toLowerCase().trim();
  const name = params.voter_name.trim();
  const client = getSupabaseClient();

  if (client) {
    // 1. Upsert Voter
    const { error: voterError } = await client
      .from('voters')
      .upsert({ email, name }, { onConflict: 'email' });
    if (voterError) console.warn('Voter upsert warning:', voterError);

    // 2. Upsert Vote
    const { data, error: voteError } = await client
      .from('votes')
      .upsert({
        photo_id: params.photo_id,
        voter_email: email,
        rating: params.rating,
        suggested_month: params.suggested_month,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'photo_id,voter_email'
      })
      .select()
      .single();

    if (voteError) throw new Error(`Speichern der Stimme fehlgeschlagen: ${voteError.message}`);
    return data as Vote;
  }

  // Local fallback
  // Save/update voter
  const voters = getLocalVoters();
  const voterIdx = voters.findIndex(v => v.email.toLowerCase() === email);
  if (voterIdx >= 0) {
    voters[voterIdx].name = name;
  } else {
    voters.push({ email, name, created_at: new Date().toISOString() });
  }
  saveLocalVoters(voters);

  // Upsert vote
  const votes = getLocalVotes();
  const existingVoteIdx = votes.findIndex(
    v => v.photo_id === params.photo_id && v.voter_email.toLowerCase() === email
  );

  const newVote: Vote = {
    id: existingVoteIdx >= 0 ? votes[existingVoteIdx].id : `vote-${Date.now()}`,
    photo_id: params.photo_id,
    voter_email: email,
    rating: params.rating,
    suggested_month: params.suggested_month,
    updated_at: new Date().toISOString()
  };

  if (existingVoteIdx >= 0) {
    votes[existingVoteIdx] = newVote;
  } else {
    votes.push(newVote);
  }
  saveLocalVotes(votes);

  return newVote;
}

export async function fetchAllVotesSummary(): Promise<Record<string, PhotoVoteSummary>> {
  const client = getSupabaseClient();
  let allVotes: Vote[] = [];

  if (client) {
    try {
      const { data, error } = await client
        .from('votes')
        .select('*');

      if (!error && data) {
        allVotes = data as Vote[];
      }
    } catch (err) {
      console.warn('Supabase fetchAllVotesSummary error, falling back:', err);
      allVotes = getLocalVotes();
    }
  } else {
    allVotes = getLocalVotes();
  }

  // Aggregate votes per photo
  const summary: Record<string, PhotoVoteSummary> = {};

  allVotes.forEach(vote => {
    if (!summary[vote.photo_id]) {
      summary[vote.photo_id] = {
        photo_id: vote.photo_id,
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        totalVotes: 0,
        monthCounts: {},
        topMonth: null
      };
    }

    const s = summary[vote.photo_id];
    if (vote.rating === 'up') s.upvotes++;
    if (vote.rating === 'down') s.downvotes++;
    s.netVotes = s.upvotes - s.downvotes;
    s.totalVotes++;

    if (vote.suggested_month && vote.suggested_month >= 1 && vote.suggested_month <= 12) {
      s.monthCounts[vote.suggested_month] = (s.monthCounts[vote.suggested_month] || 0) + 1;
    }
  });

  // Calculate top month for each photo
  Object.values(summary).forEach(s => {
    let topM = null;
    let maxCount = 0;
    let totalMonthVotes = 0;

    Object.entries(s.monthCounts).forEach(([m, count]) => {
      totalMonthVotes += count;
      if (count > maxCount) {
        maxCount = count;
        topM = parseInt(m, 10);
      }
    });

    if (topM !== null && totalMonthVotes > 0) {
      s.topMonth = {
        month: topM,
        count: maxCount,
        percentage: Math.round((maxCount / totalMonthVotes) * 100)
      };
    }
  });

  return summary;
}

export async function fetchVotersList(): Promise<VoterStats[]> {
  const client = getSupabaseClient();
  let voters: Voter[] = [];
  let votes: Vote[] = [];

  if (client) {
    try {
      const [votersRes, votesRes] = await Promise.all([
        client.from('voters').select('*').order('created_at', { ascending: false }),
        client.from('votes').select('*')
      ]);

      if (!votersRes.error && votersRes.data) voters = votersRes.data as Voter[];
      if (!votesRes.error && votesRes.data) votes = votesRes.data as Vote[];
    } catch (err) {
      console.warn('Error fetching voters list from Supabase:', err);
      voters = getLocalVoters();
      votes = getLocalVotes();
    }
  } else {
    voters = getLocalVoters();
    votes = getLocalVotes();
  }

  const voteCountMap: Record<string, { count: number; lastActive: string }> = {};
  votes.forEach(v => {
    const emailKey = v.voter_email.toLowerCase();
    if (!voteCountMap[emailKey]) {
      voteCountMap[emailKey] = { count: 0, lastActive: v.updated_at || '' };
    }
    voteCountMap[emailKey].count++;
    if (v.updated_at && (!voteCountMap[emailKey].lastActive || v.updated_at > voteCountMap[emailKey].lastActive)) {
      voteCountMap[emailKey].lastActive = v.updated_at;
    }
  });

  return voters.map(v => {
    const stats = voteCountMap[v.email.toLowerCase()] || { count: 0, lastActive: v.created_at || '' };
    return {
      email: v.email,
      name: v.name,
      votesCount: stats.count,
      lastActive: stats.lastActive || v.created_at || 'Unbekannt'
    };
  });
}

export function resetDemoData() {
  localStorage.removeItem(LS_PHOTOS_KEY);
  localStorage.removeItem(LS_VOTES_KEY);
  localStorage.removeItem(LS_VOTERS_KEY);
  window.location.reload();
}

