<script lang="ts">
    import {Button} from "$lib/components/ui/button";
    import Icon from '@iconify/svelte';
    import {auth} from '$lib/firebase';
    import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup} from 'firebase/auth';
    import {authStore} from '$lib/store';
    import { toast } from "svelte-sonner";

    let loggedIn = false;

    onAuthStateChanged(auth, (user) => {
        authStore.set({ loggedIn: !!user, user: user, userId: user ? user.uid : null });
        authStore.subscribe((value) => {
            loggedIn = value.loggedIn;
        });

        if (loggedIn && typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.href = '/';
        }
    })

    function login() {
        authStore.subscribe((value) => {
            loggedIn = value.loggedIn;
        });

        if (loggedIn) return;

        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user;
                authStore.set({loggedIn: true, user: user, userId: user.uid});
                if (typeof window !== 'undefined') {
                    window.location.href = '/';
                }
            })
            .catch((error) => {
                console.error(error);
                toast.error('Failed to log in');
            });
    }
</script>

<main class="flex flex-col items-center justify-center min-h-screen space-y-4">
    <h1 class="text-4xl font-bold">Image Viewer</h1>
    <Button on:click={login} variant="outline" class="flex items-center justify-center space-x-2 text-lg py-6 px-6">
        <Icon icon="devicon:google" width="24" height="24"/>
        <p>Login with Google</p>
    </Button>
</main>