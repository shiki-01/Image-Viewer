<script lang="ts">
    import { urls, isReady, isEditing, authStore } from "$lib/store";
    import { removeImages } from "$lib";
    import { onMount } from "svelte";
    import { dndzone } from "svelte-dnd-action";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";

    let ready = false;
    let userId: string | null = null;

    let urlList: { id: number, url: string }[] = [];

    onMount(() => {
        isReady.subscribe(value => {
            ready = value;
            authStore.subscribe((val) => {
                userId = val.userId;
            });
            urls.forEach((url, i) => {
                urlList.push({ id: i, url: url });
            });
        });
    });

    let checked: any[] = [];
    $: if ($isEditing) {
        checked = [];
    }

    function handleCheckboxChange(event: Event, url: string) {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
            checked = [...checked, url];
        } else {
            checked = checked.filter((item) => item !== url);
        }
    }

    let isDeleteDialogOpen = false;

    let isList = false;

    function handleReorder({ detail: { items } }: { detail: { items: { id: number, url: string }[] } }) {
        urls.length = 0;
        urls.push(...items.map(item => item.url));
    }
</script>

<main class="flex flex-col items-center justify-center min-h-screen space-y-4">
    {#if ready && !isList}
        {#each urls as url}
            <div class="relative">
                <img
                    src={url}
                    alt=""
                    class="object-cover max-h-[90vh] max-w-[95vw]"
                    on:click={() => {
                        if (checked.includes(url)) {
                            checked = checked.filter((item) => item !== url);
                        } else {
                            checked = [...checked, url];
                        }
                    }}
                />
                {#if $isEditing}
                {/if}
                <Checkbox
                    class="absolute top-2 right-2 border-black"
                    checked={checked.includes(url)}
                    on:click={(e) => handleCheckboxChange(e, url)}
                />
            </div>
        {/each}
    {/if}

    {#if ready && isList && urlList}
        <div use:dndzone={{ items: urlList, flipDurationMs: 0 }} on:finalize={handleReorder} class="grid grid-cols-2 gap-4">
            {#each urlList as { id, url } (id)}
                <img src={url} alt="" class="object-cover h-[100px]"/>
            {/each}
        </div>
    {/if}
</main>

{#if $isEditing}
    <div class="fixed space-x-2 bottom-5 w-full flex justify-center">
        <Button
            variant="default"
            class="text-lg py-2 px-4"
            on:click={() => isList = !isList}
        >
            List
        </Button>
        <Button
            variant="default"
            class="text-lg py-2 px-4"
            on:click={() => {
                if (checked.length === 0) return;
                isDeleteDialogOpen = true;
            }}
        >
            Delete
        </Button>
        <Button
            variant="default"
            class="text-lg py-2 px-4"
            on:click={() => isEditing.update(value => !value)}
        >
            Cancel
        </Button>
    </div>

    {#if isDeleteDialogOpen}
        <Dialog.Root open={isDeleteDialogOpen}>
            <Dialog.Content>
                <Dialog.Header>
                    <Dialog.Title>Do you really want to delete it?</Dialog.Title>
                    <Dialog.Description>
                        If you delete it completely, you will not be able to see it.
                    </Dialog.Description>
                    <div class="flex space-x-2 overflow-x-auto">
                        {#each checked as url}
                            <img src={url} alt="" class="object-cover h-[100px]"/>
                        {/each}
                    </div>
                </Dialog.Header>
                <Dialog.Footer class="flex justify-end flex-row space-x-2">
                    <Button variant="default" class="w-fit" on:click={() => isDeleteDialogOpen = false}>Cancel</Button>
                    <Button variant="outline" class="w-fit" on:click={() => {
                        removeImages(userId, checked);
                        isDeleteDialogOpen = false;
                    }}>Delete
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog.Root>
    {/if}
{/if}