// Explicit test peer, not a mocked storage/realtime transport and not desktop.
import { createClient } from '@supabase/supabase-js';
const client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const status = document.querySelector<HTMLElement>('#status')!;
const photoStatus = document.querySelector<HTMLElement>('#photo-status')!;
const photo = document.querySelector<HTMLImageElement>('#photo')!;
const purge = document.querySelector<HTMLButtonElement>('#purge')!;
let objectPath = '';
let imageURL = '';
let prefix = '';
let authToken = '';
// Expose only the individual user token for Node-side owner/RLS assertions.
// No service-role secret/database connection exists in this page.
Object.defineProperty(window, '__phoneReceiverToken', { get: () => authToken });

document.querySelector<HTMLFormElement>('#login')!.addEventListener('submit', async event => {
  event.preventDefault();
  const { data, error } = await client.auth.signInWithPassword({
    email: document.querySelector<HTMLInputElement>('#email')!.value,
    password: document.querySelector<HTMLInputElement>('#password')!.value,
  });
  document.querySelector<HTMLInputElement>('#password')!.value = '';
  if (error || !data.user || !data.session) { status.textContent = 'Receiver authentication failed'; return; }
  authToken = data.session.access_token;
  const capability = crypto.randomUUID().replaceAll('-', '');
  prefix = `${data.user.id}/${capability}`;
  document.querySelector<HTMLInputElement>('#session')!.value = prefix;
  const channel = client.channel(`phone-bridge:${capability}`, { config: { broadcast: { self: false, ack: true } } });
  channel.on('broadcast', { event: 'paired' }, async () => {
    document.querySelector<HTMLElement>('#paired')!.textContent = 'Received real phone pairing event';
    await channel.send({ type: 'broadcast', event: 'paired-ack', payload: { device: 'Explicit test transport peer' } });
  });
  channel.on('broadcast', { event: 'photo-ready' }, async message => {
    const incoming = message.payload?.path;
    if (typeof incoming !== 'string' || !incoming.startsWith(`${prefix}/`)) return;
    const downloaded = await client.storage.from('phone-bridge').download(incoming);
    if (downloaded.error || !downloaded.data) { photoStatus.textContent = 'Owner storage download failed'; return; }
    objectPath = incoming;
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = URL.createObjectURL(downloaded.data);
    photo.src = imageURL;
    photo.hidden = false;
    purge.disabled = false;
    photoStatus.textContent = 'Received real photo-ready event and downloaded owner object';
  });
  channel.subscribe(state => { status.textContent = state === 'SUBSCRIBED' ? 'Receiver subscribed' : `Receiver ${state}`; });
});
purge.addEventListener('click', async () => {
  if (!objectPath) return;
  const { error } = await client.storage.from('phone-bridge').remove([objectPath]);
  document.querySelector<HTMLElement>('#purged')!.textContent = error ? 'Owner delete failed' : 'Consumed photo deleted';
  if (!error) purge.disabled = true;
});
window.addEventListener('pagehide', () => {
  if (imageURL) URL.revokeObjectURL(imageURL);
  void client.removeAllChannels();
});
