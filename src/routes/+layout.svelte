<script lang="ts">
    import '../app.css';
    import { onMount } from "svelte";
    import { addImages, writeUrlsToStore } from "$lib";
    import { auth } from '$lib/firebase';
    import { onAuthStateChanged } from 'firebase/auth';
    import { authStore, isReady, isEditing } from '$lib/store';
    import { Button } from "$lib/components/ui/button";
    import { Toaster } from "$lib/components/ui/sonner";
    import { toast } from "svelte-sonner";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Textarea } from "$lib/components/ui/textarea";
    import Icon from '@iconify/svelte';
    import { mode, ModeWatcher, resetMode, setMode } from "mode-watcher";
    import "@fontsource/rajdhani";

    let theme: string | undefined = undefined;

    onMount(() => {
        mode.subscribe(value => {
            theme = value;
        });
    });

    let userId: string | null = null;
    let userName: string | null = null;
    let loggedIn: boolean = false;

    onAuthStateChanged(auth, async (user) => {
        authStore.set({loggedIn: !!user, user: user, userId: user ? user.uid : null});
        authStore.subscribe((value) => {
            userId = value.userId;
            userName = value.user ? value.user.displayName : null;
            loggedIn = value.loggedIn;
        });

        if (!loggedIn && typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        } else {
            if (userId) {
                await writeUrlsToStore(userId);
                isReady.set(true);
            }
        }
    })

    let isLogout = false;

    function logout() {
        authStore.subscribe((value) => {
            loggedIn = value.loggedIn;
        });

        if (!loggedIn) return;

        auth.signOut().then(() => {
            authStore.set({loggedIn: false, user: null, userId: null});
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }).catch((error) => {
            console.error(error);
            toast.error('Failed to log out');
        });
    }

    let isAddImages = false;
    let isAddImagesUrl = '';

    function parseUrl(urls: string) {
        const urlObj: string[] = [];
        urls.split('\n').forEach((url) => {
            if (url) {
                urlObj.push(url);
            }
        })
        addImages(userId, urlObj)
            .then(() => {
                toast.success('Successfully added images');
            })
            .catch((error) => {
                console.error(error);
                toast.error('Failed to add images');
            });
        isAddImages = false;
    }
</script>

<ModeWatcher/>
<Toaster/>

{#if loggedIn}
    <header class="fixed z-[99]">
        <DropdownMenu.Root>
            <DropdownMenu.Trigger class="pt-2 pl-2">
                <Icon icon="mdi:hamburger-menu" width="32" height="32"/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="t-0">
                <DropdownMenu.Group>
                    <DropdownMenu.Label>Setting</DropdownMenu.Label>
                    <DropdownMenu.Item class="flex items-center space-x-2" on:click={() => {isAddImages = true}}>
                        <Icon icon="mdi:add" width="18" height="18"/>
                        <span>Add Images</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item class="flex items-center space-x-2" on:click={() => {isEditing.update(value => !value);}}>
                        <Icon icon="mdi:edit" width="18" height="18"/>
                        <span>Edit</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator/>
                    <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger class="flex items-center space-x-2">
                            <Icon icon="mdi:theme-light-dark" width="18" height="18"/>
                            <span>Theme</span>
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.SubContent>
                            <DropdownMenu.RadioGroup value={theme}>
                                <DropdownMenu.RadioItem value="light" on:click={() => {setMode("light");theme="light"}}
                                                        class="flex items-center space-x-2">
                                    <Icon icon="mdi:weather-sunny" width="18" height="18"/>
                                    <span>Light</span>
                                </DropdownMenu.RadioItem>
                                <DropdownMenu.RadioItem value="dark" on:click={() => {setMode("dark");theme="dark"}}
                                                        class="flex items-center space-x-2">
                                    <Icon icon="mdi:weather-night" width="18" height="18"/>
                                    <span>Dark</span>
                                </DropdownMenu.RadioItem>
                                <DropdownMenu.RadioItem value="system" on:click={() => {resetMode();theme="system"}}
                                                        class="flex items-center space-x-2">
                                    <Icon icon="mdi:theme-light-dark" width="18" height="18"/>
                                    <span>System</span>
                                </DropdownMenu.RadioItem>
                            </DropdownMenu.RadioGroup>
                        </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>
                    <DropdownMenu.Separator/>
                    <DropdownMenu.Item class="flex items-center space-x-2" on:click={() => {isLogout = true}}>
                        <Icon icon="mdi:logout" width="18" height="18"/>
                        <span>log out</span>
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </header>

    <Dialog.Root open={isLogout}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>Do you really want to log out?</Dialog.Title>
                <Dialog.Description>
                    Now you are logged in with the following account: {userName}
                    <br><br>
                    If you log out, you will not be able to view the site until you access it again
                </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
                <Button variant="default" on:click={() => {isLogout = false}}>Cancel</Button>
                <Button variant="outline" on:click={logout}>Log out</Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>

    <Dialog.Root open={isAddImages}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>Add Images</Dialog.Title>
                <Dialog.Description class="pb-2">
                    Please paste the URL of the image you want to add
                </Dialog.Description>
                <Textarea placeholder="URL" class="resize-none w-full" bind:value={isAddImagesUrl}/>
            </Dialog.Header>
            <Dialog.Footer>
                <Button variant="default" on:click={() => {isAddImages = false}}>Cancel</Button>
                <Button variant="outline" on:click={() => {parseUrl(isAddImagesUrl)}}>Enter</Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}

<main class="py-12">
    <slot/>
</main>

<style lang="postcss">
    :global(body) {
        font-family: 'Rajdhani', sans-serif;
        font-weight: 600;
    }
</style>