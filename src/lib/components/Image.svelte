<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { isEditing, isLiked, isTags } from '$lib/store';

	export let src: string;
	export let liked: boolean;
	export let tags: string[];
	export let checked: string[];

	const dispatch = createEventDispatcher();
	let longPressTimeout: ReturnType<typeof setTimeout>;
	let longPressDispatched = false;

	function handlePointerDown(event: PointerEvent) {
		dispatch('pointerdown', event);
		longPressDispatched = false;
		longPressTimeout = setTimeout(() => {
			dispatch('longpress', { src });
			longPressDispatched = true;
		}, 1000);
	}

	function handlePointerUp(event: PointerEvent) {
		if (!longPressDispatched) {
			clearTimeout(longPressTimeout);
			dispatch('pointerup', event);
		}
	}

	function handlePointerLeave(event: PointerEvent) {
		if (!longPressDispatched) {
			clearTimeout(longPressTimeout);
			dispatch('pointerleave', event);
		}
	}

	function handleClick() {
		if (!longPressDispatched) {
			dispatch('click', { src });
		}
	}

	function handleContextMenu(event: MouseEvent) {
		event.preventDefault();
		dispatch('longpress', { src });
	}
</script>

<div
	class="relative"
	on:pointerdown={handlePointerDown}
	on:pointerup={handlePointerUp}
	on:pointerleave={handlePointerLeave}
	on:click={handleClick}
	on:contextmenu={handleContextMenu}
>
	<img
		{src}
		alt=""
		class="max-h-[85vh] max-w-[95vw] w-auto h-auto object-contain"
	/>
	{#if liked && $isLiked}
  <span class="label absolute top-[-6px] left-2 p-1 bg-amber-400">
   <Icon
		 icon="mdi:star"
		 class="text-white"
	 />
  </span>
	{/if}
	{#if tags.length > 0 && $isTags}
		<div class="absolute bottom-2 left-2">
			{#each tags as tag}
				<span class="px-2 py-1 text-white bg-black bg-opacity-50 rounded-full">{tag}</span>
			{/each}
		</div>
	{/if}
	{#if $isEditing}
		<Checkbox
			class="absolute top-2 right-2 border-black"
			checked={checked.includes(src)}
		/>
	{/if}
</div>

<style>
    .label:before {
        position: absolute;
        content: '';
        top: 0;
        right: -5px;
        border: none;
        border-bottom: solid 6px;
        border-right: solid 5px transparent;
				@apply border-b-amber-600;
    }

		.label:after {
        content: '';
        position: absolute;
        left: 0;
        top: 95%;
        height: 0;
        width: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 10px solid;
        @apply border-t-amber-400;
    }
</style>