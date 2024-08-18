import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { setUrls, urls as existingUrls, type Url } from './store';

async function isValidImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

function encryptText(text: string, userId: string): string {
    const key = CryptoJS.SHA256(userId).toString();
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Hex.parse(key), { iv: iv }).toString();
    return iv.toString() + ':' + encrypted;
}

function decryptText(encryptedText: string, userId: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const key = CryptoJS.SHA256(userId).toString();
    return CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Hex.parse(key), { iv: iv }).toString(CryptoJS.enc.Utf8);
}

function encryptUrl(url: string, userId: string): string {
    return encryptText(url, userId);
}

function decryptUrl(encryptedUrl: string, userId: string): string {
    return decryptText(encryptedUrl, userId);
}

async function fetchAndDecryptUrls(userId: string): Promise<Url[]> {
    const docRef = doc(db, `users/${userId}/`);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const encryptedUrls = docSnap.data().urls || [];
            return encryptedUrls.map((item: Url) => ({
                url: decryptUrl(item.url, userId),
                liked: item.liked,
                tags: item.tags.map(tag => decryptText(tag, userId))
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        return [];
    }
}

async function reloadUrls(userId: string) {
    const decryptedUrls = await fetchAndDecryptUrls(userId);
    setUrls(decryptedUrls);
}

export async function addImages(userId: string | null, urls: string[]): Promise<{ url: string, success: boolean }[]> {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const existingDecryptedUrls = await fetchAndDecryptUrls(userId);

    const results = await Promise.all(
      urls.map(async (url) => {
          const isValid = await isValidImageUrl(url);
          if (isValid && !existingDecryptedUrls.some(item => item.url === url)) {
              const encryptedUrl = encryptUrl(url, userId);
              if (encryptedUrl && !existingUrls.some(item => item.url === encryptedUrl)) {
                  existingUrls.push({ url: encryptedUrl, liked: false, tags: [] });
                  return { url, success: true };
              }
          }
          return { url, success: false };
      })
    );

    if (results.some(result => result.success)) {
        const allUrls = [
            ...existingDecryptedUrls,
            ...urls.filter(url => results.find(result => result.url === url && result.success)).map(url => ({
                url: encryptUrl(url, userId),
                liked: false,
                tags: []
            }))
        ];
        const docRef = doc(db, `users/${userId}/`);
        try {
            await setDoc(docRef, { urls: allUrls }, { merge: true });
            await reloadUrls(userId);
        } catch (error) {
            console.error('Error writing to Firestore:', error);
        }
    }

    return results;
}

export async function writeUrlsToStore(userId: string) {
    const decryptedUrls = await fetchAndDecryptUrls(userId);
    setUrls(decryptedUrls);
}

export async function editUrls(
  userId: string | null,
  urlsWithTags: { url: string, tags: string[] }[] | [],
  urlsToRemove: string[],
  urlsToToggleLiked: string[]
): Promise<void> {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const existingDecryptedUrls = await fetchAndDecryptUrls(userId);

    const updatedUrls = existingDecryptedUrls.map(item => {
        const urlWithTags = urlsWithTags.find(u => u.url === item.url);
        if (urlWithTags) {
            item.tags = urlWithTags.tags;
        }
        if (urlsToToggleLiked.includes(item.url)) {
            item.liked = !item.liked;
        }
        return item;
    }).filter(item => !urlsToRemove.includes(item.url));

    const encryptedUpdatedUrls = updatedUrls.map(item => ({
        url: encryptUrl(item.url, userId),
        liked: item.liked,
        tags: item.tags.map(tag => encryptText(tag, userId))
    }));

    const docRef = doc(db, `users/${userId}/`);
    try {
        await setDoc(docRef, { urls: encryptedUpdatedUrls }, { merge: true });
        await reloadUrls(userId);
    } catch (error) {
        console.error('Error writing to Firestore:', error);
    }
}