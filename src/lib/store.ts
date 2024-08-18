import type { UserInfo } from "firebase/auth";
import { writable } from "svelte/store";
import { getCookie, setCookie } from "./cookies";

type userId = string | null;

export const authStore = writable({ loggedIn: false, user: null as UserInfo | null, userId: null as userId});

export const isReady = writable(false);
export const isEditing = writable(false);
export const isLiked = writable(getCookie('isLiked') === 'true');
export const isTags = writable(getCookie('isTags') === 'true');
export const isAnd = writable(getCookie('isAnd') === 'true');

export type Url = {url: string, liked: boolean, tags: string[]};

export const urls: Url[] = [];
export function setUrls(newUrls: Url[]) {
    urls.length = 0;
    urls.push(...newUrls);
}