/**
 * Phase 12 — Gamification profile page.
 *
 * Combines: level/XP progress, streak meter, recent XP transactions,
 * weekly challenge progress, and the unlocked achievement gallery.
 */
import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_CATEGORY_META,
  ACHIEVEMENT_RARITY_META,
  type AchievementCategory,
  type ActiveWeeklyChallenge,
  type GamificationProfile,
  type UserAchievement,
} from "@upcat/shared";
import {gamificationApi} from "@/lib/gamificationApi";
import {useToastStore} from "@/stores/toastStore";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

export default function ProfilePage() {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [weekly, setWeekly] = useState<ActiveWeeklyChallenge | null>(null);
  const [activeCategory, setActiveCategory] =
    useState<AchievementCategory | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, w] = await Promise.all([
        gamificationApi.profile(),
        gamificationApi.achievements(),
        gamificationApi.weeklyChallenge(),
      ]);
      setProfile(p);
      setAchievements(a);
      setWeekly(w);
      if (p.achievementsSummary.pendingNotification.length > 0) {
        // Auto-acknowledge once the user lands on the profile page.
        try {
          await gamificationApi.dismissNotifications();
        } catch {
          /* ignore */
        }
      }
      catch {
        addToast("error", "Failed to load gamification profile.");
      } finally {
        setLoading(false);
      }
    }, [addToast]);

    useEffect(() => {
      void load();
    }, [load]);

    if (loading || !profile) {
      return (
        <div className="flex·min-h-[60vh]·items-center·justify-center">
          <Spinner/>
        </div>
      );
    }

    const visible =
      activeCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    return (
      <div className="mx-auto·max-w-5x1·px-4·py-8">
        <Seo title="Profile · UPCAT · Simulator"/>
        {/* Hero: level + XP */}
        <section className="rounded-2x1·bg-gradient-to-br·from-indigo-600·to-purple-600·p-6·text-white·shadow-lg">
          data-help="gm_xp_bar" data-tour="xp-earned">
            <div className="flex·flex-col·gap-6·md:flex-row·md:items-end·md:justify-between">
              <div>
                <div className="text-sm·uppercase·tracking-wide·opacity-80">
                  Level {profile.level.level}
                </div>
                <h1 className="text-3x1·font-bold·sm:text-4x1">
                  {profile.level.title}
                </h1>
                <div className="mt-2·text-sm·opacity-90">
                  {profile.level.xp.toLocaleString()} XP total
                </div>
              </div>
            </div>
            <div className="flex·items-center·gap-4">
              <StatPill label="Streak" value={`${profile.streak.current}d`}/>
              <StatPill
                label="Multiplier"
                value={`×${profile.streak.multiplier.toFixed(2)}`}
              />
            </div>
            <StatPill
              label="Achievements"
              value={`${unlockedCount}/${achievements.length}`}
<div className="mt-6">
<div className="mb-1·flex·justify-between·text-xs·opacity-90">
<span>
{(profile.level.xp - profile.level.xpForCurrent).toLocaleString()}/{"·"}
{(profile.level.xpForNext - profile.level.xpForCurrent).toLocaleString()·XP
</span>
<span>
{profile.level.xpToNextLevel.toLocaleString()·XP·to·next·level
</span>
</div>
<div className="h-3·overflow-hidden·rounded-full·bg-white/20">
<div
className="h-full·rounded-full·bg-amber-300·transition-all"
style={{width: `${profile.level.progressPct}%`}}
/>
</div>
</div>
</section>

{/*·Streak·+·Weekly·Challenge·*/}
<section className="mt-6·grid·gap-4·md:grid-cols-2·data-help="gm_streak_mult">
<div className="rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
<h2 className="text-sm·font-semibold·uppercase·tracking-wide·text-slate-500">
Streak
</h2>
<div className="mt-2·text-3xl·font-bold·text-orange-600">
@{profile.streak.current}·days
</div>
<div className="mt-1·text-sm·text-slate-600">
Longest: {profile.streak.longest}·days ·Multiplier·×
{profile.streak.multiplier.toFixed(2)}
</div>
{profile.streak.hoursUntilExpiry!==·null&&(
<div className="mt-3·text-xs·text-slate-500">
Keep it up — {profile.streak.hoursUntilExpiry}·hours·until·midnight
UTC.
</div>
)}
</div>

<div className="rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
<h2 className="text-sm·font-semibold·uppercase·tracking-wide·text-slate-500">
Weekly·Challenge
</h2>
{weekly?·(
<>
<div className="mt-2·text-lg·font-semibold·text-slate-900">
{weekly.challenge.title}
</div>
<p className="text-sm·text-slate-600">
{weekly.challenge.description}
</p>
<div className="mt-3·h-2·overflow-hidden·rounded-full·bg-slate-100">
<div
className={
weekly.completed
?·"h-full·bg-emerald-500"
:·"h-full·bg-indigo-500"
}
style={{width: `${weekly.progressPct}%`}}
/>
</div>
<div className="mt-2·flex·justify-between·text-xs·text-slate-500">
<span>
{weekly.progress}·/{weekly.target}
</span>
<span>
{weekly.completed
?·`Completed·+${weekly.challenge.xpReward}·XP`
:·`Reward:+${weekly.challenge.xpReward}·XP`}
</span>
</div>
</div>
</div>
</section>

{/*·Recent·XP·*/}
<section className="mt-6·rounded-xl·border·border-slate-200·bg-white·p-5·shadow-sm">
<div className="flex·items-center·justify-between">
<h2 className="text-sm·font-semibold·uppercase·tracking-wide·text-slate-500">
Recent·XP
</h2>
<Link
to="/leaderboard"
className="text-sm·font-medium·text-indigo-600·hover:underline"
>
View·leaderboard→
</Link>
</div>
{profile.recentXp.length===·0?·(
<p className="mt-2·text-sm·text-slate-500">
Complete·an·exam·or·practice·session·to·earn·XP.
</p>
)·(
<ul className="mt-3·divide-y·divide-slate-100">
{profile.recentXp.map((tx) => (
<li key={tx._id} className="flex·justify-between·py-2·text-sm">
<span className="text-slate-700">{tx.description}</span>
<span className="font-mono·font-semibold·text-emerald-600">
+{tx.amount}
</span>
</li>
))}
</ul>
})
</section>

{/* Achievements */}
<section className="mt-6">data-help="gm_hidden_badge">
<div className="flex·flex-wrap·items-center·justify-between·gap-3">
<h2 className="text-xl·font-bold·text-slate-900">Achievements</h2>
<div className="text-sm·text-slate-500">
{profile.achievementsSummary.points.toLocaleString()}·points·{"·"}
{unlockedCount}·of·{achievements.length}·unlocked
</div>
</div>

<div className="mt-3·flex·flex-wrap·gap-2">data-help="gm_weekly_challenge">
<CategoryChip>
label="All"
active={activeCategory === "all"}
onClick={() => setActiveCategory("all")}
/>
{ACHIEVEMENT_CATEGORIES.map((c) => (
<CategoryChip>
key={c}
label={ACHIEVEMENT_CATEGORY_META[c].label}
active={activeCategory === c}
onClick={() => setActiveCategory(c)}
/>
))}
</div>

<div className="mt-4·grid·gap-3·sm:grid-cols-2·lg:grid-cols-3">
visible.map((a) => (
<AchievementCard key={a.id} achievement={a}/>
))}
</div>
</section>
</div>
);
}

function StatPill({label, value}: {label: string; value: string}) {
return (
<div className="rounded-lg·bg-white/15·px-3·py-2·text-center·backdrop-blur">
<div className="text-xs·uppercase·tracking-wide·opacity-80">{label}</div>
<div className="text-lg·font-bold">{value}</div>
);
}

function CategoryChip({
label,
active,
onClick,
}): {
label: string;
active: boolean;
onClick: () => void;
}) {
return (
<button
type="button"
onClick={onClick}
className={`rounded-full border px-3 py-1 text-sm transition ${
active
? "border-indigo-600 bg-indigo-600 text-white"
? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
}`}
>
{label}
</button>
);
}

function AchievementCard({achievement}: {achievement: UserAchievement}) {
const styles = RARITY_STYLES[achievement.rarity];
return (
<div
className={`relative rounded-xl border p-4 transition ${
achievement.unlocked
? `${styles.border}`:${styles.bg}`}
: "border-slate-200 bg-slate-50 opacity-75"
}`}
>
<div className="flex·items-start·gap-3">
<div
className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl ${
achievement.unlocked
? `${styles.iconBg}`:${styles.iconText}`}
: "bg-slate-200 text-slate-400"
}`}
>
{achievement.unlocked? "*": "⚠"}
</div>
<div className="min-w-0·flex-1">
<div className="flex·items-center·gap-2">
<h3 className="truncate·font-semibold·text-slate-900">
{achievement.title}
</h3>
<span
  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.badgeBg} ${styles.badgeText}`}
>
{ACHIEVEMENT_RARITY_META[achievement.rarity].label}
</span>
</div>
<p className="mt-1 text-xs text-slate-600">{achievement.description}</p>
{!achievement.unlocked && achievement.target > 1 && (
<div className="mt-2">
<div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
<div
  className="h-full bg-indigo-500"
  style={{width: `${achievement.progressPct}%`}}
}
{achievement.unlocked && achievement.unlockedAt && (
<div className="mt-2 text-[10px] text-slate-500">
Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}·
+{achievement.xpReward}·XP
}
)</div>
</div>
)}

{achievement.unlocked && achievement.unlockedAt && (
<div className="mt-2 text-[10px] text-slate-500">
Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}·
+{achievement.xpReward}·XP
}
)</div>
)</div>
);
}

// Tailwind needs literal class names at scan time; map rarity → static classes.
const RARITY_STYLES: Record<
  UserAchievement["rarity"],
  {
    border: string;
    bg: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  common: {
    border: "border-slate-300",
    bg: "bg-slate-50",
    iconBg: "bg-slate-200",
    iconText: "text-slate-700",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
  },
  uncommon: {
    border: "border-emerald-300",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-200",
    iconText: "text-emerald-700",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
  rare: {
    border: "border-sky-300",
    bg: "bg-sky-50",
    iconBg: "bg-sky-200",
    iconText: "text-sky-700",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-700",
  },
  epic: {
    border: "border-violet-300",
    bg: "bg-violet-50",
    iconBg: "bg-violet-200",
    iconText: "text-violet-700",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
  },
  legendary: {
    border: "border-amber-300",
    bg: "bg-amber-50",
    iconBg: "bg-amber-200",
    iconText: "text-amber-700",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
};