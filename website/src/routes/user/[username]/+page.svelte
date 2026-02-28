<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	
	// UI Components
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	
	// Custom Components
	import DataTable from '$lib/components/self/DataTable.svelte';
	import ProfileBadges from '$lib/components/self/ProfileBadges.svelte';
	import UserName from '$lib/components/self/UserName.svelte';
	import ProfileSkeleton from '$lib/components/self/skeletons/ProfileSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import AdLong from '$lib/components/self/ads/AdLong.svelte';
	
	// Icons & Utils
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Calendar01Icon,
		Wallet01Icon,
		TradeUpIcon,
		TradeDownIcon,
		Coins01Icon,
		Activity01Icon,
		PercentIcon,
		Invoice03Icon,
		Award05Icon,
		UnavailableIcon
	} from '@hugeicons/core-free-icons';
	import { getPublicUrl, formatPrice, formatValue, formatQuantity, formatDate } from '$lib/utils';
	import { USER_DATA } from '$lib/stores/user-data';

	// PROPS - Single declaration to fix "Identifier 'data' has already been declared"
	let { data } = $props();

	// Derived values from props
	let username = $derived(data.username);

	// STATE - Initialized with untrack to prevent "state_referenced_locally" build warnings
	let profileData = $state(untrack(() => data.profileData));
	let recentTransactions = $state(untrack(() => data.recentTransactions));
	let loading = $state(false);
	let userAchievements = $state<any[]>([]);
	let previousUsername = $state<string | null>(null);
	let isBlocked = $state(false);
	let blockLoading = $state(false);

	// Sync local state when page data changes (navigation)
	$effect(() => {
		profileData = data.profileData;
		recentTransactions = data.recentTransactions;
	});

	let isOwnProfile = $derived(
		$USER_DATA && profileData?.profile && $USER_DATA.username === profileData.profile.username
	);

	async function checkBlockStatus() {
		if (!$USER_DATA || isOwnProfile) return;
		try {
			const res = await fetch('/api/settings/blocked');
			if (res.ok) {
				const blockList = await res.json();
				isBlocked = blockList.blocks?.some((b: any) => b.username === username) ?? false;
			}
		} catch { /* silent */ }
	}

	async function toggleBlock() {
		if (!$USER_DATA || isOwnProfile || blockLoading) return;
		blockLoading = true;
		try {
			const res = await fetch(`/api/user/${username}/block`, {
				method: isBlocked ? 'DELETE' : 'POST',
			});
			if (res.ok) {
				isBlocked = !isBlocked;
				toast.success(isBlocked ? 'User blocked' : 'User unblocked');
			} else {
				const errorData = await res.json();
				toast.error(errorData.message || 'Failed to update block status');
			}
		} catch {
			toast.error('Failed to update block status');
		} finally {
			blockLoading = false;
		}
	}

	onMount(async () => {
		previousUsername = username;
		fetchAchievements();
		checkBlockStatus();

		if (isOwnProfile) {
			await fetchTransactions();
		}
	});

	// Handle navigation between different user profiles
	$effect(() => {
		if (username && previousUsername && username !== previousUsername) {
			userAchievements = [];
			fetchAchievements();
			checkBlockStatus();
			previousUsername = username;
		}
	});

	async function fetchTransactions() {
		if (!isOwnProfile) return;
		try {
			const response = await fetch('/api/transactions?limit=10');
			if (response.ok) {
				const txData = await response.json();
				recentTransactions = txData.transactions || [];
			}
		} catch (e) {
			console.error('Failed to fetch transactions:', e);
		}
	}

	async function fetchAchievements() {
		try {
			const res = await fetch(`/api/user/${username}/achievements`);
			if (res.ok) {
				const achievementData = await res.json();
				userAchievements = achievementData.achievements || [];
			}
		} catch { /* silent */ }
	}

	// Stats Calculations
	let memberSince = $derived(
		profileData?.profile
			? new Date(profileData.profile.createdAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long'
				})
			: ''
	);
	
	let hasCreatedCoins = $derived(
		profileData?.createdCoins?.length > 0
	);

	let totalTradingVolume = $derived(
		profileData?.stats
			? Number(profileData.stats.totalBuyVolume) + Number(profileData.stats.totalSellVolume)
			: 0
	);

	let buyPercentage = $derived(
		profileData?.stats && totalTradingVolume > 0
			? (Number(profileData.stats.totalBuyVolume) / totalTradingVolume) * 100
			: 0
	);
	let sellPercentage = $derived(
		profileData?.stats && totalTradingVolume > 0
			? (Number(profileData.stats.totalSellVolume) / totalTradingVolume) * 100
			: 0
	);

	let totalPortfolioValue = $derived(Number(profileData?.stats?.totalPortfolioValue ?? 0));
	let baseCurrencyBalance = $derived(Number(profileData?.stats?.baseCurrencyBalance ?? 0));
	let holdingsValue = $derived(Number(profileData?.stats?.holdingsValue ?? 0));
	let totalBuyVolume = $derived(Number(profileData?.stats?.totalBuyVolume ?? 0));
	let totalSellVolume = $derived(Number(profileData?.stats?.totalSellVolume ?? 0));
	let buyVolume24h = $derived(Number(profileData?.stats?.buyVolume24h ?? 0));
	let sellVolume24h = $derived(Number(profileData?.stats?.sellVolume24h ?? 0));

	let totalTradingVolumeAllTime = $derived(totalBuyVolume + totalSellVolume);
	let totalTradingVolume24h = $derived(buyVolume24h + sellVolume24h);

	// Arcade stats
	let arcadeWins = $derived(Number(profileData?.profile?.arcadeWins ?? 0));
	let arcadeLosses = $derived(Number(profileData?.profile?.arcadeLosses ?? 0));
	let totalPlayed = $derived(arcadeWins + arcadeLosses);
	let netProfit = $derived(arcadeWins - arcadeLosses);
	let winRate = $derived(totalPlayed > 0 ? ((arcadeWins / totalPlayed) * 100).toFixed(1) : '0.0');

	// Table Configurations
	const createdCoinsColumns = [
		{
			key: 'coin',
			label: 'Coin',
			class: 'pl-6 font-medium',
			render: (value: any, row: any) => ({
				component: 'coin',
				icon: row.icon,
				symbol: row.symbol,
				name: row.name
			})
		},
		{
			key: 'currentPrice',
			label: 'Price',
			class: 'font-mono',
			render: (value: any) => `$${formatPrice(parseFloat(value))}`
		},
		{
			key: 'marketCap',
			label: 'Market Cap',
			class: 'hidden font-mono sm:table-cell',
			render: (value: any) => formatValue(parseFloat(value))
		},
		{
			key: 'change24h',
			label: '24h Change',
			class: 'hidden md:table-cell',
			render: (value: any) => ({
				component: 'badge',
				variant: parseFloat(value) >= 0 ? 'success' : 'destructive',
				text: `${parseFloat(value) >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`
			})
		},
		{
			key: 'createdAt',
			label: 'Created',
			class: 'text-muted-foreground hidden text-sm lg:table-cell',
			render: (value: any) => formatDate(value)
		}
	];

	const transactionsColumns = [
		{
			key: 'type',
			label: 'Type',
			class: 'w-[12%] min-w-[60px] md:w-[8%] pl-6',
			render: (value: any, row: any) => {
				if (value === 'TRANSFER_IN' || value === 'TRANSFER_OUT') {
					return {
						component: 'badge',
						variant: 'default',
						text: value === 'TRANSFER_IN' ? 'Received' : 'Sent',
						class: 'text-xs'
					};
				}
				return {
					component: 'badge',
					variant: value === 'BUY' ? 'success' : 'destructive',
					text: value === 'BUY' ? 'Buy' : 'Sell',
					class: 'text-xs'
				};
			}
		},
		{
			key: 'coin',
			label: 'Coin',
			class: 'w-[20%] min-w-[100px] md:w-[12%]',
			render: (value: any, row: any) => {
				const sym = row.coinSymbol || row.coin?.symbol;
				return {
					component: 'coin',
					icon: row.coinIcon || row.coin?.icon,
					symbol: sym,
					name: sym ? `*${sym}` : '-',
					size: 4
				};
			}
		},
		{
			key: 'sender',
			label: 'Sender',
			class: 'w-[12%] min-w-[70px] md:w-[10%]',
			render: (value: any, row: any) => ({
				component: 'text',
				text: row.sender || row.senderUsername || '-',
				class: 'font-medium'
			})
		},
		{
			key: 'recipient',
			label: 'Receiver',
			class: 'w-[12%] min-w-[70px] md:w-[10%]',
			render: (value: any, row: any) => ({
				component: 'text',
				text: row.recipient || row.recipientUsername || '-',
				class: 'font-medium'
			})
		},
		{
			key: 'quantity',
			label: 'Quantity',
			class: 'w-[12%] min-w-[70px] md:w-[10%] font-mono text-sm',
			render: (value: any) => value === 0 ? '-' : formatQuantity(parseFloat(value))
		},
		{
			key: 'totalBaseCurrencyAmount',
			label: 'Amount',
			class: 'w-[12%] min-w-[70px] md:w-[10%] font-mono text-sm font-medium',
			render: (value: any) => formatValue(parseFloat(value))
		},
		{
			key: 'timestamp',
			label: 'Date',
			class: 'hidden md:table-cell md:w-[18%] text-muted-foreground text-sm',
			render: (value: any) => formatDate(value)
		}
	];
</script>

<SEO
	title={profileData?.profile?.name
		? `${profileData.profile.name} (@${profileData.profile.username}) - Rugplay`
		: `@${username} - Rugplay`}
	description={profileData?.profile?.bio || `View @${username}'s profile and simulated trading activity in Rugplay.`}
	type="profile"
	image={profileData?.profile?.image ? getPublicUrl(profileData.profile.image) : '/apple-touch-icon.png'}
	imageAlt="@{username}'s profile"
	keywords="crypto trader profile game, virtual trading portfolio, rugplay"
	twitterCard="summary"
/>

<div class="container mx-auto max-w-6xl p-6">
	{#if loading}
		<ProfileSkeleton />
	{:else if !profileData}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">Failed to load profile</div>
				<Button onclick={() => window.location.reload()}>Try Again</Button>
			</div>
		</div>
	{:else}
		<Card.Root class="mb-6 py-0">
			<Card.Content class="p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
					<div class="flex-shrink-0">
						<Avatar.Root class="size-20 sm:size-24">
							<Avatar.Image src={getPublicUrl(profileData.profile.image)} alt={profileData.profile.name} />
							<Avatar.Fallback class="text-xl">{profileData.profile.name.charAt(0).toUpperCase()}</Avatar.Fallback>
						</Avatar.Root>
					</div>

					<div class="min-w-0 flex-1">
						<div class="mb-3">
							<div class="mb-1 flex flex-wrap items-center gap-2">
								<h1 class="text-2xl font-bold sm:text-3xl">
									<UserName name={profileData.profile.name} nameColor={profileData.profile.nameColor} />
								</h1>
								<ProfileBadges user={profileData.profile} />
							</div>
							<p class="text-muted-foreground text-lg">@{profileData.profile.username}</p>
						</div>

						{#if profileData.profile.bio}
							<p class="text-muted-foreground mb-3 max-w-2xl leading-relaxed">{profileData.profile.bio}</p>
						{/if}

						<div class="text-muted-foreground flex items-center gap-2 text-sm">
							<HugeiconsIcon icon={Calendar01Icon} class="h-4 w-4" />
							<span>Joined {memberSince}</span>
						</div>
					</div>

					{#if $USER_DATA && !isOwnProfile}
						<div class="ml-auto self-start">
							<Tooltip.Provider>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={isBlocked ? 'outline' : 'ghost'}
											size="icon"
											onclick={toggleBlock}
											disabled={blockLoading}
											class="h-8 w-8 {isBlocked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}"
										>
											<HugeiconsIcon icon={UnavailableIcon} class="h-4 w-4" />
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content>{isBlocked ? 'Unblock' : 'Block'}</Tooltip.Content>
								</Tooltip.Root>
							</Tooltip.Provider>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">Total Portfolio</div>
						<HugeiconsIcon icon={Wallet01Icon} class="text-muted-foreground h-4 w-4" />
					</div>
					<div class="mt-1 text-2xl font-bold">{formatValue(totalPortfolioValue)}</div>
					<p class="text-muted-foreground text-xs">{profileData.stats.holdingsCount} holdings</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="text-muted-foreground text-sm font-medium">Liquid Value</div>
					<div class="text-success mt-1 text-2xl font-bold">{formatValue(baseCurrencyBalance)}</div>
					<p class="text-muted-foreground text-xs">Available cash</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="text-muted-foreground text-sm font-medium">Illiquid Value</div>
					<div class="text-success mt-1 text-2xl font-bold">{formatValue(holdingsValue)}</div>
					<p class="text-muted-foreground text-xs">Coin holdings</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">Buy/Sell Ratio</div>
					</div>
					<div class="mt-1 flex items-center gap-2">
						<span class="text-success text-xl font-bold">{buyPercentage.toFixed(1)}%</span>
						<span class="text-xl font-bold text-red-600">{sellPercentage.toFixed(1)}%</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-foreground text-sm font-medium">Buy Activity</div>
						<HugeiconsIcon icon={TradeUpIcon} class="text-success h-4 w-4" />
					</div>
					<div class="text-success mt-1 text-2xl font-bold">{formatValue(totalBuyVolume)}</div>
					<div class="text-success mt-3 border-t pt-3 text-lg font-bold">{formatValue(buyVolume24h)} (24h)</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-foreground text-sm font-medium">Sell Activity</div>
						<HugeiconsIcon icon={TradeDownIcon} class="h-4 w-4 text-red-600" />
					</div>
					<div class="mt-1 text-2xl font-bold text-red-600">{formatValue(totalSellVolume)}</div>
					<div class="mt-3 border-t pt-3 text-lg font-bold text-red-600">{formatValue(sellVolume24h)} (24h)</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="text-muted-foreground text-sm font-medium">Total Volume</div>
					<div class="mt-1 text-2xl font-bold">{formatValue(totalTradingVolumeAllTime)}</div>
					<div class="text-muted-foreground text-xs">{profileData.stats.totalTransactions} total trades</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="text-muted-foreground text-sm font-medium">24h Volume</div>
					<div class="mt-1 text-2xl font-bold">{formatValue(totalTradingVolume24h)}</div>
					<div class="text-muted-foreground text-xs">{profileData.stats.transactions24h || 0} trades today</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
			<Card.Root class="py-0">
				<Card.Content class="p-4 text-success">
					<div class="text-sm font-medium text-foreground">Arcade Wins</div>
					<div class="mt-1 text-2xl font-bold">{formatValue(arcadeWins)}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="py-0">
				<Card.Content class="p-4 text-red-600">
					<div class="text-sm font-medium text-foreground">Arcade Losses</div>
					<div class="mt-1 text-2xl font-bold">{formatValue(arcadeLosses)}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="text-muted-foreground text-sm font-medium">Win Rate</div>
					<div class="mt-1 text-2xl font-bold">{winRate}%</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="text-muted-foreground text-sm font-medium">Net Profit</div>
					<div class="mt-1 text-2xl font-bold {netProfit >= 0 ? 'text-success' : 'text-red-600'}">
						{netProfit >= 0 ? '' : '-'}{formatValue(Math.abs(netProfit))}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		{#if userAchievements.length > 0}
			<Card.Root class="mb-6">
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<Card.Title class="flex items-center gap-2">
							<HugeiconsIcon icon={Award05Icon} class="h-5 w-5 text-yellow-500" />
							Achievements ({userAchievements.filter((a) => a.unlocked).length}/{userAchievements.length})
						</Card.Title>
						<Button variant="outline" size="sm" onclick={() => goto('/achievements')}>View All</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-2">
						{#each userAchievements as achievement}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<img
										src="/achievements/{achievement.icon}"
										alt={achievement.name}
										class="h-8 w-8 cursor-pointer transition-all {achievement.unlocked ? 'hover:scale-110' : 'brightness-[0.3] grayscale'}"
									/>
								</Tooltip.Trigger>
								<Tooltip.Content class="bg-secondary text-secondary-foreground ring-1 ring-border">
									<p class="font-semibold">{achievement.name}</p>
									<p class="text-muted-foreground text-xs">{achievement.description}</p>
								</Tooltip.Content>
							</Tooltip.Root>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<AdLong />

		{#if hasCreatedCoins}
			<Card.Root class="mb-6">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<HugeiconsIcon icon={Coins01Icon} class="h-5 w-5" />
						Created Coins ({profileData.createdCoins.length})
					</Card.Title>
				</Card.Header>
				<Card.Content class="p-0">
					<DataTable
						columns={createdCoinsColumns}
						data={profileData.createdCoins}
						onRowClick={(coin) => goto(`/coin/${coin.symbol}`)}
					/>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<HugeiconsIcon icon={Activity01Icon} class="h-5 w-5" />
					Recent Activity
				</Card.Title>
			</Card.Header>
			<Card.Content class="p-0">
				<DataTable
					columns={transactionsColumns}
					data={recentTransactions}
					emptyIcon={Invoice03Icon}
					emptyTitle="No recent activity"
				/>
			</Card.Content>
		</Card.Root>
	{/if}
</div>