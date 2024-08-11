import type { UserInfo } from "firebase/auth";
import { writable } from "svelte/store";

type userId = string | null;

export const authStore = writable({ loggedIn: false, user: null as UserInfo | null, userId: null as userId});

export const isReady = writable(false);

export const isEditing = writable(false);

export const urls: string[] = [];
export function setUrls(newUrls: string[]) {
    urls.length = 0;
    urls.push(...newUrls);
}