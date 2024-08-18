<script lang="ts">
	import { urls, isReady, isEditing, isAnd, authStore, type Url } from '$lib/store';
	import { editUrls } from '$lib';
	import { onMount, tick } from 'svelte';
	import { z } from 'zod';
	import { type SuperForm, superForm } from 'sveltekit-superforms';
	import { Field, Control, Label, FieldErrors } from 'formsnap';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { Selected } from 'bits-ui';
	import { dndzone } from 'svelte-dnd-action';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import Icon from '@iconify/svelte';
	import Image from '$lib/components/Image.svelte';
	import { setCookie } from '$lib/cookies';

	let ready = false;
	let userId: string | null = null;

	let urlList: { id: number, url: string }[] = [];
	let tags: string[] = [];
	let filledTags: string[] = [];
	let filtered: Url[] = [];
	let margin: boolean = false;

	onMount(() => {
		isReady.subscribe(value => {
			ready = value;
			authStore.subscribe((val) => {
				userId = val.userId;
			});
			urls.forEach((url, i) => {
				urlList.push({ id: i, url: url.url });
				if (url.tags) {
					url.tags.forEach(tag => {
						if (!tags.includes(tag)) {
							tags = [...tags, tag];
						}
					});
				}
			});
			filtered = urls;
		});
	});

	$: if ($isAnd) {
		filtered = urls.filter((url) => {
			return filledTags.every((tag) => url.tags?.includes(tag));
		});
	} else {
		if (filledTags.length === 0) {
			filtered = urls;
		} else {
			filtered = urls.filter((url) => {
				return filledTags.some((tag) => url.tags?.includes(tag));
			});
		}
	}

	let checked: any[] = [];
	$: if ($isEditing) {
		checked = [];
	}

	let isDeleteDialogOpen = false;
	let isList = false;

	let isTagDialogOpen = false;
	let isTagsGroupOpen = false;

	function handleGroupTags() {
		if (checked.length === 0) return;
		isTagsGroupOpen = true;
		selectedTags = checked.reduce((acc, url) => {
			const tags = urls.find((n) => n.url === url)?.tags;
			if (tags) {
				return acc.length === 0 ? tags : acc.filter((tag: string) => tags.includes(tag));
			}
			return acc;
		}, []);
		notSelectedTags = tags.filter((tag) => !selectedTags.includes(tag));
		isTagDialogOpen = true;
	}

	let isMobile: boolean = false;
	onMount(() => {
		if (typeof window !== 'undefined') {
			isMobile = window.innerWidth < 768;
		}
	});

	let isContextMenuOpen = false;
	let selectedContext: string = '';

	function handleLongPress(event: CustomEvent, url: string) {
		event.preventDefault();
		isContextMenuOpen = true;
		selectedContext = url;
	}

	let isTagsOpen = false;
	let selectedTags: string[] = [];
	let selectedTag: { value: string }[] | undefined = undefined;
	let notSelectedTags: string[] = [];
	let newTag: string = '';

	function closeAndFocusTrigger(triggerId: string) {
		isTagsOpen = false;
		tick().then(() => {
			document.getElementById(triggerId)?.focus();
		});
	}

	const form = superForm({
		tags: z.array(z.string()).optional()
	}, {
		dataType: 'json'
	});

	type FormData = {
		tags?: string[];
	};

	const formData = form.form as unknown as FormData;
	$: filledTags = formData.tags ?? [];

	function selectedChange(s: { value: string }[] | undefined): void {
		if (s) {
			formData.tags = s.map((c: { value: string }) => c.value);
		} else {
			formData.tags = [];
		}
	}
</script>

{#if tags.length > 0}
	<div
		class="fixed bottom-1 left-[-230px] flex flex-row z-[99] transition-all {margin ? 'translate-x-[235px]' : 'translation-x-0'}"
	>
		<span>
			<form method="POST" use:form.enhance class="flex flex-col gap-4">
				<Field {form} name="tags">
					<Control let:attrs>
						<Select.Root
							multiple
							selected={selectedTag}
							onSelectedChange={(s) => selectedChange(s)}
						>
							{#if formData.tags}
								{#each formData.tags as tag}
									<input name={attrs.name} hidden value={tag} />
								{/each}
							{/if}
							<Select.Trigger {...attrs} class="w-[180px]">
								<Select.Value placeholder="tag" />
							</Select.Trigger>
							<Select.Content>
									{#each tags as tag}
										<Select.Item value={tag}>
											{tag}
										</Select.Item>
									{/each}
							</Select.Content>
						</Select.Root>
					</Control>
					<FieldErrors />
				</Field>
			</form>
		</span>
		<Button
			variant="outline"
			class="mx-2 p-1"
			on:click={() => {
				isAnd.update(value => {
					const newValue = !value;
					setCookie('isAnd', newValue.toString(), 7);
					return newValue;
				});
			}}
		>
			{#if $isAnd}
				<Icon icon="mdi:alpha-a" width="32" height="32" />
			{:else}
				<Icon icon="mdi:alpha-o" width="32" height="32" />
			{/if}
		</Button>
		<Button
			variant="none"
			class="pl-2"
			on:click={() => {
				margin = !margin
			}}
		>
			<Icon icon="mdi:hamburger-menu" width="32" height="32" />
		</Button>
	</div>
{/if}

<main class="flex flex-col items-center justify-center min-h-screen space-y-4">
	{#if ready && !isList}
		{#each filtered as url}
			<Image
				src={url.url}
				liked={url.liked}
				tags={url.tags}
				checked={checked}
				on:longpress={(e) => handleLongPress(e, url.url)}
				on:click={() => {
					if (checked.includes(url.url)) {
					 checked = checked.filter((item) => item !== url.url);
					} else {
					 checked = [...checked, url.url];
					}
				 }}
			/>
		{/each}
	{/if}

	{#if ready && isList && urlList}
		<div use:dndzone={{ items: urlList, flipDurationMs: 0 }} class="grid grid-cols-2 gap-4">
			{#each urlList as { id, url } (id)}
				<img src={url} alt="" class="object-cover h-[100px]" />
			{/each}
		</div>
	{/if}
</main>

{#if isContextMenuOpen}
	{#if isMobile}
		<Drawer.Root bind:open={isContextMenuOpen} onOpenChange={() => {if (isContextMenuOpen) isContextMenuOpen = false;}}>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Image Option</Drawer.Title>
					<Drawer.Description>
						Please select the option you want to do.
					</Drawer.Description>
				</Drawer.Header>
				<div>
					<Button
						variant="default"
						class="w-full"
						on:click={() => {
							editUrls(userId, [], [], [selectedContext]);
							isContextMenuOpen = false;
						}}
					>
						{urls.find((url) => url.url === selectedContext)?.liked ? 'Unlike' : 'Like'}
					</Button>
					<Button
						variant="default"
						class="w-full"
						on:click={() => {
							selectedTags = urls.find((url) => url.url === selectedContext)?.tags || [];
							notSelectedTags = tags.filter((tag) => !selectedTags.includes(tag));
							isTagsGroupOpen = false;
							isTagDialogOpen = true;
							isContextMenuOpen = false;
						}}
					>
						Tag
					</Button>
				</div>
				<Drawer.Footer>
					<Drawer.Close on:click={() => isContextMenuOpen = false}>Close</Drawer.Close>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Root>
	{:else}
		<Dialog.Root bind:open={isContextMenuOpen} onOpenChange={() => {if (isContextMenuOpen) isContextMenuOpen = false;}}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Image Option</Dialog.Title>
					<Dialog.Description>
						Please select the option you want to do.
					</Dialog.Description>
				</Dialog.Header>
				<div class="flex flex-col space-y-2">
					<Button
						variant="default"
						class="w-full"
						on:click={() => {
							editUrls(userId, [], [], [selectedContext]);
							isContextMenuOpen = false;
						}}
					>
						{urls.find((url) => url.url === selectedContext)?.liked ? 'Unlike' : 'Like'}
					</Button>
					<Button
						variant="default"
						class="w-full"
						on:click={() => {
							selectedTags = urls.find((url) => url.url === selectedContext)?.tags || [];
							notSelectedTags = tags.filter((tag) => !selectedTags.includes(tag));
							isTagsGroupOpen = false;
							isTagDialogOpen = true;
							isContextMenuOpen = false;
						}}
					>
						Tag
					</Button>
				</div>
				<Dialog.Footer class="flex justify-end flex-row space-x-2">
					<Button variant="default" class="w-fit" on:click={() => isContextMenuOpen = false}>Close</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
{/if}

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
                editUrls(userId, [], [], checked);
            }}
		>
			Liked
		</Button>
		<Button
			variant="default"
			class="text-lg py-2 px-4"
			on:click={() => handleGroupTags()}
		>
			Tag
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
		<Dialog.Root open={isDeleteDialogOpen} onOpenChange={() => {if (isDeleteDialogOpen) isDeleteDialogOpen = false;}}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Do you really want to delete it?</Dialog.Title>
					<Dialog.Description>
						If you delete it completely, you will not be able to see it.
					</Dialog.Description>
					<div class="flex space-x-2 overflow-x-auto">
						{#each checked as url}
							<img src={url} alt="" class="object-cover h-[100px]" />
						{/each}
					</div>
				</Dialog.Header>
				<Dialog.Footer class="flex justify-end flex-row space-x-2">
					<Button variant="default" class="w-fit" on:click={() => isDeleteDialogOpen = false}>Cancel</Button>
					<Button
						variant="outline"
						class="w-fit"
						on:click={() => {
							editUrls(userId, [], checked, []);
							isDeleteDialogOpen = false;
						}}>
						Delete
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
{/if}

{#if isTagDialogOpen}
	{#if isMobile}
		<Drawer.Root open={isTagDialogOpen} onOpenChange={() => {if (isTagDialogOpen) isTagDialogOpen = false;}}>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Tag</Drawer.Title>
					<Drawer.Description>
						Please select the tags you want to add.
					</Drawer.Description>
				</Drawer.Header>
				<div class="flex p-4 flex-col space-y-2">
					<div class="w-full p-1 overflow-x-auto flex space-x-1">
						{#each selectedTags as tag}
							<Badge
								value={tag}
								variant="outline"
							>
								<span>
									{tag}
								</span>
								<Button
									variant="none"
									class="w-fit h-fit p-0"
									on:click={() => {
										notSelectedTags = [...notSelectedTags, tag];
										selectedTags = selectedTags.filter((selectedTag) => selectedTag !== tag);
									}}
								>
									<Icon icon="mdi:close" width="16" />
								</Button>
							</Badge>
						{/each}
					</div>
					<Popover.Root bind:open={isTagsOpen} let:ids>
						<Popover.Trigger asChild let:builder>
							<Button
								builders={[builder]}
								variant="outline"
								size="sm"
								class="w-[150px] justify-start"
							>
								+ Set status
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-[200px] p-0" side="right" align="start">
							<Command.Root>
								<Command.Input placeholder="Change status..." bind:value={newTag} />
								<Command.List>
									<Command.Empty>
										<Button
											variant="none"
											class="w-full"
											on:click={() => {
												if (newTag === '' || selectedTags.includes(newTag)) return;
												notSelectedTags = [...notSelectedTags, newTag];
												newTag = '';
											}}
										>
											{#if newTag === ''}
												<span>Enter a new tag</span>
											{:else}
												<span>Add</span>
											{/if}
										</Button>
									</Command.Empty>
									<Command.Group>
										{#each notSelectedTags as status}
											<Command.Item
												value={status}
												onSelect={(currentValue) => {
													selectedTags = [...selectedTags, currentValue];
													notSelectedTags = notSelectedTags.filter((tag) => tag !== currentValue);
													closeAndFocusTrigger(ids.trigger);
												}}
											>
												<span>
													{status}
												</span>
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
				<Drawer.Footer>
					<Button
						variant="default"
						on:click={() => {
							if (isTagsGroupOpen) {
								const urls = checked.map((url) => ({url, tags: selectedTags}));
								editUrls(
									userId,
									urls,
									[],[]
								);
							} else {
								const index = urls.findIndex((n) => n.url === selectedContext);
								if (index === -1 || urls[index].tags === selectedTags) {
									isTagDialogOpen = false;
									return;
								}
								editUrls(
									userId,
									[{url: selectedContext, tags: selectedTags}],
									[],[]
								);
							}
							isTagDialogOpen = false;
						}}
					>
						Enter
					</Button>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Root>
	{:else}
		<Dialog.Root open={isTagDialogOpen} onOpenChange={() => {if (isTagDialogOpen) isTagDialogOpen = false;}}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Description>
						Please select the tags you want to add.
					</Dialog.Description>
				</Dialog.Header>
				{#if isTagsGroupOpen}
					<div class="flex space-x-2 overflow-x-auto">
						{#each checked as url}
							<img src={url} alt="" class="object-cover h-[100px]" />
						{/each}
					</div>
				{/if}
				<div class="flex p-4 flex-col space-y-2">
					<div class="w-full p-1 overflow-x-auto flex space-x-1">
						{#each selectedTags as tag}
							<Badge
								value={tag}
								variant="outline"
							>
								<span>
									{tag}
								</span>
								<Button
									variant="none"
									class="w-fit h-fit p-0"
									on:click={() => {
										notSelectedTags = [...notSelectedTags, tag];
										selectedTags = selectedTags.filter((selectedTag) => selectedTag !== tag);
									}}
								>
									<Icon icon="mdi:close" width="16" />
								</Button>
							</Badge>
						{/each}
					</div>
					<Popover.Root bind:open={isTagsOpen} let:ids>
						<Popover.Trigger asChild let:builder>
							<Button
								builders={[builder]}
								variant="outline"
								size="sm"
								class="w-[150px] justify-start"
							>
								+ Set status
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-[200px] p-0" side="right" align="start">
							<Command.Root>
								<Command.Input placeholder="Change status..." bind:value={newTag} />
								<Command.List>
									<Command.Empty>
										<Button
											variant="none"
											class="w-full"
											on:click={() => {
												if (newTag === '' || selectedTags.includes(newTag)) return;
												notSelectedTags = [...notSelectedTags, newTag];
												newTag = '';
											}}
										>
											{#if newTag === ''}
												<span>Enter a new tag</span>
											{:else}
												<span>Add</span>
											{/if}
										</Button>
									</Command.Empty>
									<Command.Group>
										{#each notSelectedTags as status}
											<Command.Item
												value={status}
												onSelect={(currentValue) => {
													selectedTags = [...selectedTags, currentValue];
													notSelectedTags = notSelectedTags.filter((tag) => tag !== currentValue);
													closeAndFocusTrigger(ids.trigger);
												}}
											>
												<span>
													{status}
												</span>
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
				<Dialog.Footer class="flex justify-end flex-row space-x-2">
					<Button variant="default" class="w-fit" on:click={() => isTagDialogOpen = false}>Cancel</Button>
					<Button
						variant="outline"
						class="w-fit"
						on:click={() => {
							if (isTagsGroupOpen) {
								const urls = checked.map((url) => ({url, tags: selectedTags}));
								editUrls(
									userId,
									urls,
									[],[]
								);
							} else {
								const index = urls.findIndex((n) => n.url === selectedContext);
								if (index === -1 || urls[index].tags === selectedTags) {
									isTagDialogOpen = false;
									return;
								}
								editUrls(
									userId,
									[{url: selectedContext, tags: selectedTags}],
									[],[]
								);
							}
							isTagDialogOpen = false;
						}}>
						Enter
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
{/if}