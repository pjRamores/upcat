/* eslint-disable max-lines */

function article({
  slug,
  category,
  order,
  title,
  subtitle,
  body,
  quickFacts = null,
  relatedArticles = [],
  relatedFeaturePages = [],
  contextualHelpIds = [],
  faqs = null,
}) {
  return {
    slug,
    category,
    subcategory: null,
    order,
    title,
    subtitle,
    content: {
      format: "markdown",
      body,
    },
    quickFacts,
    relatedArticles,
    relatedFeaturePages,
    contextualHelpIds,
    faqs,
    screenshots: null,
    status: "published",
    seoTitle: title,
    seoDescription: subtitle,
  };
}

const HELP_CATEGORIES = [
  {
    _id: "getting-started",
    category: "getting-started",
    name: "Getting Started",
    description: "Start here if you are new to the platform.",
    icon: "🤱",
  },
  {
    _id: "practice-test",
    category: "practice-test",
    name: "Practice Tests",
    description: "Configure and review personalized practice sessions.",
    icon: "🤱",
  },
  {
    _id: "mock-exam",
    category: "mock-exam",
    name: "Mock Exams",
    description: "Realistic exam simulation under stricter rules.",
    icon: "🤱",
  },
  {
    _id: "gamification",
    category: "gamification",
    name: "Gamification & Progress",
    description: "XP, levels, streaks, achievements, and rankings.",
    icon: "🤱",
  },
  {
    _id: "study-plan",
    category: "study-plan",
    name: "Study Plan",
    description: "Your adaptive daily curriculum.",
    icon: "🤱",
  },
  {
    _id: "account",
    category: "account",
    name: "Account & Settings",
    description: "Profile, security, and help preferences.",
    icon: "🤱",
  },
  {
    _id: "payment",
    category: "payment",
    name: "Premium & Payments",
    description: "Plans, billing, and subscription lifecycle.",
    icon: "🤱",
  },
  {
    _id: "troubleshooting",
    category: "troubleshooting",
    name: "Troubleshooting",
    description: "Common issues and quick solutions.",
    icon: "🤱",
  },
];

const HELP_ARTICLES = [
  {
    article({
      slug: "welcome",
      category: "getting-started",
      order: 1,
      title: "Welcome to UPCAT Simulator",
      subtitle: "A beginner-friendly overview of the platform and how to get started.",
    },
  }
];
relatedArticles: ["creating-account", "navigating-dashboard", "how-practice-test-works"],
relatedFeaturePages: ["/dashboard", "/practice", "/study-plan"],
body: `## What is UPCAT Simulator?
UPCAT Simulator is an online review platform designed to help you prepare for college entrance-style tests through guided study, targeted practice, and realistic exam simulation.

You get three study experiences:
1. **Practice Tests** for flexible learning sessions.
2. **Mock Exams** for realistic time-pressure assessment.
3. **Study Plan** for daily, personalized progress.

## What is the UPCAT?
The **University of the Philippines College Admission Test (UPCAT)** is a high-stakes admission exam used by the University of the Philippines system.
It typically includes language, mathematics, science, and reading-heavy reasoning.

> [!info]
> The platform focuses on skill-building and exam readiness. It is not a replacement for school learning, but a structured companion.

## How This Platform Helps You Prepare
### 1. Build Fundamentals First
Start with shorter card sessions and focused subject drills to build understanding.

### 2. Train Speed and Endurance
Once your foundation improves, increase card volume and move into full mock simulations.

### 3. Measure Real Readiness
Mock exams replicate stricter conditions so you can evaluate your performance under pressure.

### 4. Track Progress Over Time
Your dashboards and statistics pages show trends, weak areas, and improvements.

## Feature Overview
| Feature | Best For | Pressure Level | Feedback Timing |
| :--- | :--- | :--- | :--- |
| Practice Test | Learning and skill-building | Low to medium | Immediate or end-of-session |
| Mock Exam | Readiness checks | High | End-of-exam only |
| Study Plan | Daily guided progress | Medium | Session and module-based |
| Gamification | Motivation and consistency | N/A | Real-time XP/achievement updates |

## Your First 5 Minutes
1. Open your dashboard.
2. Open Practice Test and choose a mode.
3. Start a short session (about 15-30 cards).
4. Rate each card honestly using Again/Hard/Good/Easy.
5. Review deck statistics and identify 1-2 weak topics.

## Platform Disclaimer
UPCAT Simulator is an independent educational platform and is not affiliated with the University of the Philippines or the official UPCAT administration.

## Next Steps
- Read [How Practice Tests Work](/help/article/how-practice-test-works)
- Read [Navigating the Dashboard](/help/article/navigating-dashboard)
- Start your first practice session on [/practice](/practice)
- ,
- )),
- article({
  slug: "creating-account",
  category: "getting-started",
  order: 2,
  title: "Creating Your Account",
  subtitle: "Complete registration, email verification, social login, and security setup.",
  relatedArticles: ["account-settings", "navigating-dashboard"],
  relatedFeaturePages: ["/register", "/settings"],
  body: `## Registration Steps
1. Go to the registration page.
2. Enter your first name, last name, email, and password.
3. Confirm your password and submit.
4. Check your email for the verification link.

![Registration Form Placeholder](/help-assets/screenshots/register-form.png)

## Email Verification
After registration:
1. Open your inbox.
2. Find the verification email from UPCAT Simulator.
3. Click the verification link.
4. Return to the app and sign in.

> [!warning]
> If you do not verify your email, some account recovery and security actions may be limited.

## Social Login Options
You can link or sign in with:
- Google
- Facebook
- LinkedIn

### Recommended Setup
Even if you use social login, set a local password in Settings so you have a backup sign-in method.

## Set Up Your Profile
After your first login, visit Settings and confirm:
- Full name
- Contact email
- Notification preferences
- Linked accounts

## Account Security Basics
### Password
Use a strong password with:
- At least 8 characters
- Uppercase and lowercase letters
- At least one number and symbol

### Recovery Codes
Generate recovery codes and store them safely offline.

### Security Questions
Set three security questions that you can remember but others cannot guess.

## Quick Checklist
| Task | Recommended | Where |
|---|---|---|
| Verify email | Yes | Inbox link |
| Link social account | Optional | Settings |
| Set local password | Yes | Settings |
| Generate recovery codes | Yes | Settings |
| Configure notifications | Yes | Settings |

## Troubleshooting
If the verification email does not arrive:
1. Check your spam or junk folders.
2. Wait 2-5 minutes and request a new link.
3. Verify that your email address is spelled correctly.
4. Contact support if the issue persists.

```json
{
  article({
    slug: "navigating-dashboard",
    category: "getting-started",
    order: 3,
    title: "Navigating the Dashboard",
    subtitle: "Understand every dashboard section and how to navigate efficiently.",
    relatedArticles: ["how-practice-test-works", "how-mock-exam-works", "personalized-study-plan"],
    relatedFeaturePages: ["/dashboard", "/stats", "/profile"],
    body: `## Dashboard Layout at a Glance
The dashboard is your command center. Start study sessions, view summaries, and navigate quickly to deeper statistics and insights.

![Dashboard Annotated Placeholder](/help-assets/screenshots/dashboard-annotated.png)

## Main Sections
### Practice Test
Use this for flexible practice sessions with configurable scope and pacing.

### Mock Exam
Use this when you want stricter simulation and readiness measurement.

### Study Plan
Shows your current personalized plan and today's recommended session.

### Statistics Preview
Displays trends and key metrics to help you decide what to focus on next.

### Gamification Summary
Shows your XP, level, streak, and challenge progress at a glance.

## Quick Actions and Shortcuts
- **Start Practice**: Begin a learning-focused session.
- **Resume Session**: Continue unfinished work.
- **View Statistics**: Inspect weak areas and trends.
- **Open Profile**: Check achievements and streak status.

## Recommended Dashboard Routine
1. Check your weak areas.
2. Run a targeted practice session.
3. Review your mistakes.
4. Complete one study plan activity.
5. Reflect briefly on your session.

## Beginner Tip
Start small and stay consistent. Daily 30-minute focused sessions usually outperform occasional marathon study sessions.

```json
{
  article({
    slug: "how-practice-test-works",
    category: "practice-test",
    order: 1,
    title: "How Practice Tests Work",
    subtitle: "Understand practice test structure and when to use this mode.",
    relatedArticles: ["configuring-practice-test", "taking-practice-test", "practice-test-results"],
    relatedFeaturePages: ["/practice"],
    contextualHelpIds: ["pt_subject_select", "pt_subtopic_select", "pt_question_count", "pt_random_cards", "pt_presets"],
    quickFacts: [
      {label: "Session style", value: "Card-by-card spaced repetition"},
      {label: "Card limits", value: "You control max cards and new cards"},
      {label: "Rating", value: "Again / Hard / Good / Easy"},
      {label: "Progress", value: "Tracked in deck stats and retention"},
      {label: "Subjects", value: "Any combination"},
    ],
    body: `## What Is a Practice Test?
A Practice Test is a configurable learning session designed for **understanding and improvement**, not pressure-based assessment.

## Practice Test vs. Mock Exam
| Aspect | Practice Test | Mock Exam |
|---|---|---|
| Configuration | You choose all settings | Admin-defined structure |
| Answer Flow | Card-by-card with rationale | Full exam sections |
| Scoring | Deck progress and retention | Readiness assessment score |
| Purpose | Learning and skill-building | Readiness assessment |
| Stress level | Low to medium | High |

## Key Characteristics
- You choose mode, subject scope, and card limits.
- Each card is answered, revealed, then rated using Again/Hard/Good/Easy.
- Ratings update the spaced-repetition schedule so weak cards return sooner.
- Results are tracked in deck health, retention, and upcoming due load.
- The session design encourages consistent practice over irregular cramming.

## When To Use Practice Tests
```json
- Daily review sessions
- Weak-topic drilling
- Learning new material
- Confidence building before mock exams

> [!tip]
> Use practice tests to examine your thinking process. The goal is clarity, not just a high score.

## Suggested Frequency
- **Beginners**: 4-5 short sessions per week
- **Intermediate**: 5-6 mixed sessions per week
- **Advanced**: 3-4 targeted sessions plus 1 mock exam per week

- },)
- article({
- slug: "configuring-practice-test",
- category: "practice-test",
- order: 2,
- title: "Configuring Your Practice Test",
- subtitle: "Configure your session with practical setup recommendations.",
- relatedArticles: ["taking-practice-test", "practice-test-results"],
- relatedFeaturePages: ["/practice-test/configure", "/practice"],
- contextualHelpIds: [
- "pt_subject_select",
- "pt_subtopic_select",
- "pt_question_count",
- "pt_random_cards",
- "pt_presets",
- ],
- body: `## Step 1: Choose Subjects and Topics
- Select one or more subjects.
- Optionally choose specific subtopics for focused drilling.
- Use a broad selection for variety or a targeted selection to address weak areas.

> [!tip]
> For best results, focus on 1-2 weak areas per session.

## Step 2: Set Session Limits
Choose a practical session size based on your available study time.

**Recommended ranges:**
- Quick review: 10-20 cards (about 10-25 minutes)
- Standard session: 20-40 cards (about 25-50 minutes)
- Deep practice: 40-60 cards (about 50-75 minutes)

Set the new-card limit carefully. Too many new cards at once can reduce retention.

## Step 3: Grow Your Deck with Random Cards
Use **Generate random cards** right below Session sizing help when you want to expand your deck.

- Enter how many cards to add (recommended: 3-10 for most days).
- Add fewer cards on heavy review days to protect retention.
- Add more cards when your due load is light and you can absorb new material.

> [!tip]
> This control is always available, even if your deck is empty.

## Step 4: Choose Mode Intentionally
- **Review**: Revisit cards that are due for review.
- **Mixed**: Balance new cards with review cards.
- **Subject Focus**: Target one specific subject area.

> [!tip]
> If your retention has dropped, prioritize Review mode for 2-3 sessions.

## Step 5: Start and Rate Honestly
After each card is revealed, rate its difficulty honestly:
- **Again**: You did not recall the answer.
- **Hard**: You had partial recall or felt uncertain.
- **Good**: You answered correctly with manageable effort.
- **Easy**: You recalled the answer automatically.

## Step 6: Iterate Using Deck Statistics
After your session, check deck status and due load in Practice Deck Statistics.
Adjust your next session by subject focus, card volume, or mode.

- },)
- article({
- slug: "taking-practice-test",
- category: "practice-test",
- order: 3,
- title: "Taking a Practice Test",
- subtitle: "Understand the interface, controls, and navigation during a session.",
- relatedArticles: ["practice-test-results", "reviewing-practice-answers"],
- relatedFeaturePages: ["/practice", "/practice/:sessionId"],
- body: `## Interface overview
- Progress indicator
- Card question and answer choices
- Rationale panel after submission
- Rating controls (Again/Hard/Good/Easy)

## Per-card flow
1. Read the card and choose an answer.
2. Submit to reveal correct answer and rationale.
3. Rate recall quality.
4. Move to the next card.

## Why ratings matter
Your rating updates the spaced-repetition schedule:
- Lower ratings return sooner.
- Higher ratings space cards out further.

This is the main mechanism that improves long-term retention.
## Common pacing strategy
- If you are unsure, submit anyway and learn from rationale.
- Avoid rushing ratings; they directly affect future review quality.
- Keep sessions short and consistent rather than very long and irregular.

## Session completion
At the end of a session, you get a summary and your deck stats update automatically.

```json
> [!tip]
> Accuracy and honest ratings together are more valuable than speed alone.
},
```

article({
  slug: "practice-test-results",
  category: "practice-test",
  order: 4,
  title: "Understanding Practice Test Results",
  subtitle: "Interpret deck metrics and retention trends to guide your next session.",
  relatedArticles: ["reviewing-practice-answers", "configuring-practice-test"],
  relatedFeaturePages: ["/practice/stats", "/practice"],
  body: `## Practice results breakdown
- Session accuracy and total answered
- Deck status totals (new/learning/review/mastered)
- Due today / due this week
- Subject-level accuracy and card counts
- Retention trend

## Score interpretation
- 90-100%: Excellent
- 75-89%: Good
- 60-74%: Fair
- Below 60%: Needs work

## What to do after seeing results
1. Pick your lowest 1-2 subtopics.
2. Run a focused practice set on those topics.
3. Compare retention and due load on your next run.

## Next-session options
- **Review-heavy run**: ideal when due queue is growing.
- **Subject-focus run**: ideal when one area lags.
- **Mixed run**: ideal for balance once weak spots stabilize.

## How to read retention signals
- High accuracy + low retention growth: ratings may be too optimistic.
- Low accuracy + high due backlog: reduce new cards temporarily.
- Stable retention + shrinking weak areas: continue current cadence.

```

article({
  slug: "reviewing-practice-answers",
  category: "practice-test",
  order: 5,
  title: "Reviewing Practice Test Answers",
  subtitle: "Turn review sessions into long-term retention and mastery.",
  relatedArticles: ["practice-test-results", "how-practice-test-works"],
  relatedFeaturePages: ["/practice/stats", "/practice"],
  body: `## Where to review in the current flow
Practice review is distributed across:
- per-card rationale during sessions
- deck browser and subject metrics in Practice Deck Stats

## Useful filters
- Subject
- Subtopic
- Card status
- Correct/incorrect

## Per-question details
Each item usually includes:
- Prompt preview
- Subject area
- Card status and interval
- Next scheduled review

## How to read rationales effectively
1. Restate the question in your own words.
2. Explain why the correct option is right.
3. Explain why each distractor is wrong.
4. Note recurring error patterns.

## Add to spaced repetition
Cards you miss repeatedly should be rated lower so they return sooner.

## Practice similar questions
Use subject-focus mode to reinforce the same concept with varied prompts.

```json
> [!tip]
> Strong review means understanding the decision path, not memorizing letter keys.
```

article({
  slug: "how-mock-exam-works",
  category: "mock-exam",
  order: 1,
  title: "How Mock Exams Work",
  subtitle: "Understand the strict simulation rules and readiness assessment.",
  relatedArticles: ["taking-mock-exam", "mock-exam-results", "mock-exam-strategies"],
  relatedFeaturePages: ["/mock-exam", "/dashboard"],
  quickFacts: [
    {label: "Questions", value: "Set by admin, typically 100-200"},
    {label: "Timer", value: "Strict per subtest, cannot pause"},
    {label: "Subtests", value: "Usually 4"},
    {label: "Feedback", value: "After full submission"},
{label: "Scoring", value: "Raw, percentage, percentile"},
body: `## What Is a Mock Exam?
A Mock Exam is a realistic simulation that replicates actual exam pressure and pacing.

## Practice Test vs. Mock Exam Comparison
| Feature | Practice Test | Mock Exam |
|---|---|---|
| Configuration | User-defined | Admin-defined |
| Timer | Optional and pausable | Strict and cannot be paused |
| Subjects | Flexible selection | Full exam structure |
| Navigation | Usually flexible | Restricted by subtest |
| Scoring | Learning-oriented | Readiness-oriented |

## Key Characteristics
- Fixed structure and rules
- Subtests with separate time limits
- Possible negative marking penalties
- Limited attempt frequency and cooldown periods

## Best Time To Take Mock Exams
- After at least 2 weeks of steady practice
- After completing key study plan modules
- 1-2 weeks before your target exam date

## Availability Notes
Mock exam availability may be limited based on your subscription plan, cooldown periods, and scheduling windows.

`,
-}}),
article({
slug: "taking-mock-exam",
category: "mock-exam",
order: 2,
title: "Taking a Mock Exam — Step by Step",
subtitle: "Complete a preparation checklist and understand the subtest flow.",
relatedArticles: ["mock-exam-results", "mock-exam-strategies"],
relatedFeaturePages: ["/mock-exam", "/exam/:id"],
body: `## Before You Start
Ensure you have:
- Stable internet connection
- Uninterrupted time block for the full exam
- Quiet, distraction-free environment
- Scratch paper and pencil nearby

## Start Sequence
1. Open an available mock exam.
2. Review the total duration and exam rules.
3. Confirm your readiness.
4. Click begin; the timer starts immediately.

## Subtest Flow
Mock exams typically consist of multiple subtests, each with its own time limit.

### Timer Warning Colors
- **White**: Comfortable; plenty of time remaining
- **Yellow**: Less than 10 minutes remaining
- **Red**: Less than 5 minutes remaining
- **Flashing**: Less than 1 minute remaining

## Navigation Rules
- You can usually navigate within the current subtest.
- Returning to previous subtests is typically not allowed.

## Finishing Subtests
When you finish a subtest, review any unanswered and flagged items first, because prior sections are usually locked after you proceed.

## Emergency Situations
- **Connection loss**: Answered items are automatically synced periodically
- **Browser crash**: Recover your session quickly by reopening it
- **Power interruption**: The timer usually continues server-side

> [!warning]
> Treat mock exams like real exam events. Avoid interruptions and multitasking.

},
article({
slug: "mock-exam-results",
category: "mock-exam",
order: 3,
title: "Understanding Mock Exam Results",
subtitle: "Interpret raw score, adjusted score, percentile, and readiness bands.",
relatedArticles: ["mock-exam-strategies", "how-mock-exam-works"],
relatedFeaturePages: ["/results/:sessionId", "/stats"],
body: `## Overall Score Components
- Raw score (total correct)
- Adjusted score (if negative marking applies)
- Percentage correct
- Readiness band or assessment tier

### Adjusted Score Formula
Adjusted score is often calculated as:
**Adjusted = Correct - (Incorrect × Penalty)**

**Example:**
- Correct: 156
- Incorrect: 30
- Penalty: 0.25
- Adjusted: 156 - (30 × 0.25) = 148.5

## Percentile Explained
If you score at the 78th percentile, you scored higher than 78% of test takers in that comparison group.

## Predicted Score
Predicted score is an estimate based on your performance, not an official result.
> [!warning]
> Do not over-focus on a single predicted score. Track your trajectory across multiple mock exams.

## Time Analysis Interpretation
- **Finished very early**: You may have rushed through questions.
- **Ran out of time**: You may have a pacing issue to address.
- **Used time effectively**: You demonstrated balanced pacing.

## Action Plan After Results
1. Identify your weakest subtest.
2. Run targeted practice on those weak areas.
3. Retake the mock exam after focused review.
-,
-...}),
-article({
  slug: "mock-exam-strategies",
  category: "mock-exam",
  order: 4,
  title: "Mock·Exam·Strategies·&·Tips",
  subtitle: "Practical·tactics·for·pacing,·answering·strategies,·and·test·discipline.",
  relatedArticles: ["taking-mock-exam", "mock-exam-results"],
  relatedFeaturePages: ["/mock-exam", "/exam/:id"],
  body: `## Time Management Rules
- Calculate an average time budget per question.
- Avoid spending more than 2 minutes on any single question.
- Flag uncertain questions and return to them if time permits.
- Reserve the final minutes for a quick review of unanswered items.

## Answering Strategy
- Read the complete question stem before reviewing answer choices.
- Eliminate clearly incorrect options.
- Use keyword clues in the question and answers.
- In math and science, estimate the answer first for a sanity check.

## Negative Marking Strategy
- If you can eliminate 2 or more options, educated guessing may be favorable.
- If you cannot eliminate any options reliably, skipping may be safer depending on the penalty.

## Preparation Routine Before Mock Day
- Take 2-3 mock exams before your target date.
- Simulate real testing conditions as closely as possible.
- Review error patterns, not just final scores.
- Rest adequately before high-stakes exam attempts.
-,
-...}),
-article({
  slug: "xp-levels-progress",
  category: "gamification",
  order: 1,
  title: "XP,·Levels·&·Your·Progress",
  subtitle: "Understand·XP·earning,·level·progression,·and·streak·multiplier·mechanics.",
  relatedArticles: ["achievements-badges", "weekly-challenges", "leaderboard-rankings"],
  relatedFeaturePages: ["/profile", "/leaderboard"],
  body: `## What Is XP?
XP (Experience Points) reflects consistent study effort and progress.

## How To Earn XP
| Activity | XP |
| :--- | :--- |
| Complete a practice test | 30 XP |
| Complete a mock exam | 75 XP |
| Correct answer during practice | 1 XP |
| Correct answer during mock exam | 3 XP |
| High score bonuses | Varies by threshold |
| Daily login | 10 XP |
| Study plan session completion | 30 XP |

## Streak Multiplier
Longer active streaks increase your XP rewards.

**Example:**
If the base reward is 75 XP and your streak multiplier is 1.75, you earn 131 XP (rounding policy may vary).

## Level System
Each level requires more XP than the previous level. Level tiers provide milestone recognition and motivation.

## Where To Monitor Progress
- Dashboard summary
- Your profile page
- Post-session reward breakdown
- Leaderboard comparisons
-,
-...}),
-article({
  slug: "achievements-badges",
  category: "gamification",
  order: 2,
  title: "Achievements·&·Badges",
  subtitle: "Understand·badge·categories,·rarity·tiers,·and·unlock·notifications.",
  relatedArticles: ["xp-levels-progress", "weekly-challenges"],
  relatedFeaturePages: ["/profile"],
  body: `## What Are Achievements?
Achievements are milestone badges that recognize consistency, performance, and mastery.

## Badge Categories
- **Milestones**: Activity count-based badges
- **Performance**: High score achievements
- **Streak**: Consecutive active day recognition
- **Dedication**: Time and behavior pattern achievements
- **Mastery**: Subject excellence badges
- **Hidden Achievements**: Surprise unlocks for discovery

## Rarity Tiers
- Common
- Uncommon
- Rare
- Epic
- Legendary

## Tips To Unlock Efficiently
1. Prioritize consistency above all else.
2. Balance easy wins with long-term goals.
3. Review your progress weekly and adjust your focus.

- },)
- article({
  slug: "weekly-challenges",
  category: "gamification",
  order: 3,
  title: "Weekly Challenges",
  subtitle: "Understand weekly objectives and plan your study time effectively.",
  relatedArticles: ["xp-levels-progress", "leaderboard-rankings"],
  relatedFeaturePages: ["/profile", "/dashboard"],
  body: `## Weekly Challenge Basics
A new challenge is assigned every Monday.

Complete it before the Sunday cutoff to earn bonus rewards.

## Typical Challenge Examples
- Complete 3 practice tests
- Reach a target score in a specific subject
- Maintain a streak of a certain length

## Planning Advice
- Check your challenge early Monday morning.
- Spread your effort across the entire week.
- Pair challenge tasks with your existing study plan activities.

- },)
- article({
  slug: "leaderboard-rankings",
  category: "gamification",
  order: 4,
  title: "Leaderboard & Rankings",
  subtitle: "Understand how rankings are calculated and how they relate to your performance.",
  relatedArticles: ["mock-exam-results", "xp-levels-progress"],
  relatedFeaturePages: ["/leaderboard"],
  body: `## What Leaderboard Shows
The leaderboard highlights relative performance within selected comparison scopes.

## Ranking Dimensions
- XP-based ranking
- Score-based ranking (where applicable)
- Level-based ranking

## Time Windows
- This week
- This month
- All time

## Privacy
Display names are partially masked for safety and fairness.

## Important Distinction
**Mock percentile** and **leaderboard rank** are different metrics and should not be confused or used interchangeably.

- },)
- article({
  slug: "personalized-study-plan",
  category: "study-plan",
  order: 1,
  title: "Your Personalized Study Plan",
  subtitle: "Understand how diagnosis and adaptation create your learning path.",
  relatedArticles: ["taking-practice-test", "mock-exam-strategies"],
  relatedFeaturePages: ["/study-plan", "/study-plan/setup"],
  body: `## What the Study Plan Does
It provides a structured daily curriculum that adapts based on your performance.

## Personalization Inputs
- Diagnostic baseline assessment
- Subject-level accuracy trends
- Time-on-task behavior patterns
- Assessment outcomes and mastery

## Plan Structure
- Phases (major study blocks)
- Modules (topic groups)
- Daily sessions (learning units)
- End-of-module assessments (mastery checks)

## If You Fail an Assessment
You typically receive review reinforcement before you can retry the progression check.

## Plan Adaptation Behavior
- **Strong performance**: Increases challenge level and pacing.
- **Struggle patterns**: Adds targeted review and additional practice.

## Pause, Resume, or Reschedule
You can adjust your study timeline without losing any progress history.

> [!tip]
> Treat missed days as schedule adjustments, not failures. Resume quickly when you are ready.

- },)
- article({
  slug: "account-settings",
  category: "account",
order: 1,
title: "Account Settings & Security",
subtitle: "Manage your profile, security options, and help preferences.",
relatedArticles: ["creating-account", "common-issues"],
relatedFeaturePages: ["/settings"],
body: `## Profile Management
In Settings, review and update your account identity fields and linked login providers.

## Password and Security
- Change your password
- Generate and store recovery codes
- Configure security questions

## Linked Social Accounts
Connect or disconnect login providers:
- Google
- Facebook
- LinkedIn

## Notification Controls
Manage push reminders and weekly challenge alerts.

## Privacy Controls
Review settings for analytics sharing and account data requests.

## Help Preferences
Control your help experience:
- Contextual help tooltips
- Onboarding guides
- Reduced help mode
`,
- }),
article({
slug: "premium-features",
category: "payment",
order: 1,
title: "Premium Features",
subtitle: "Explore premium benefits and manage your subscription.",
relatedArticles: ["account-settings", "common-issues"],
relatedFeaturePages: ["/pricing", "/settings/payments", "/payment"],
body: `## Premium Overview
Premium membership provides expanded access and convenience features designed for high-frequency learners.

## Free vs. Premium Comparison
| Capability | Free | Premium |
| :--- | :--- | :--- |
| Mock exam attempts | Limited per period | Expanded quota |
| Practice session limits | Standard limits | Higher limits |
| Advertisements | Visible | Reduced or none |
| Advanced analytics | Limited features | Full feature access |

## How To Upgrade
1. Open the pricing page.
2. Select a subscription plan.
3. Choose your payment method.
4. Submit your payment; wait for verification if manual review is required.

## Subscription Management
In Settings, you can view your plan status, expiration date, and recent payment submissions.

## When Premium Expires
Your account remains active, but premium-only features may return to free-tier limits.

`,
- }),
article({
slug: "common-issues",
category: "troubleshooting",
order: 1,
title: "Common Issues & Solutions",
subtitle: "Quick troubleshooting for technical, scoring, and account issues.",
relatedArticles: ["taking-mock-exam", "account-settings", "premium-features"],
relatedFeaturePages: ["/support", "/settings", "/payment"],
faqs: [
  {
    question: "My exam timer ran out before I finished. What should I do?",
    answer: "Review your pacing metrics in the exam results. Then run shorter timed practice drills to build speed before your next full simulation.",
  },
  {
    question: "I lost internet connection during an exam.",
    answer: "Reconnect to the internet as quickly as possible and reopen your exam session. Your answers are auto-synced periodically.",
  },
  {
    question: "I forgot my password and do not have recovery codes.",
    answer: "Use the account recovery flow. If needed, contact support with verification details.",
  },
  ],
body: `## Timer Ended Before Completion
### Why This Happens
- Spending too much time on a few difficult questions
- Slow reading pace across the exam
- Re-checking answers too frequently

### Fix Plan
1. Practice with strict time targets per question.
2. Use the flag-and-return strategy for difficult items.
3. Review and drill your slowest-performing subtopics.

## Lost Internet During Exam
- Reconnect to the internet immediately.
- Reopen your exam session page.
- Continue answering if time remains on the timer.

## Score Seems Wrong
Double-check:
- Negative marking rules for incorrect answers
- Count of unanswered questions
- Subtest-specific scoring formulas

If the discrepancy persists, submit a support ticket with your session ID.

## Cannot Start Mock Exam
Possible causes:
- Cooldown period is still active
- Attempt limit has been reached
- Scheduling window has closed

## Payment Submitted But Not Yet Approved
Manual review can take time depending on the review queue and payment submission clarity.

## Forgot Password and No Recovery Codes
Use the account recovery flow first. If needed, contact support for manual verification.

## Blank Page or App Not Loading
1. Perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R).
2. Clear your browser's cached files.
3. Try a different browser or network connection.
4. Check our platform status page.

## Question Typo or Content Error
Use the in-app question flagging feature to report content inaccuracies.

## Contact Support
Open a support ticket through the support page and include:
- Your account email address
- A brief summary of the issue
- Steps to reproduce the problem
- A screenshot if possible

```json
{
  "welcome",
  "creating-account",
  "navigating-dashboard",
  "how-practice-test-works",
  "configuring-practice-test",
  "taking-practice-test",
  "practice-test-results",
  "reviewing-practice-answers",
  "how-mock-exam-works",
  "taking-mock-exam",
  "mock-exam-results",
  "mock-exam-strategies",
  "xp-levels-progress",
  "achievements-badges",
  "weekly-challenges",
  "leaderboard-rankings",
  "personalized-study-plan",
  "account-settings",
  "premium-features",
  "common-issues",
};
```

```json
const CONTEXTUAL_HELP = [
  {
    "_id": "pt_subtopic_select",
    "page": "/practice-test/configure",
    "elementRef": "[data-help='pt_subtopic_select']",
    "type": "tooltip",
    "title": "Choosing Subjects",
    "shortDescription": "Select one or more subjects. More subjects means more variety.",
    "detailedContent": "null",
    "helpArticleSlug": "configuring-practice-test",
    "helpArticleSection": "#step-1-choose-subjects-and-topics",
    "showForNewUsers": "true",
    "showIcon": "true",
    "triggerOnHover": "true",
    "dismissable": "true",
    "isActive": "true",
    "order": 1
  },
  {
    "_id": "pt_subtopic_select",
    "page": "/practice-test/configure",
    "elementRef": "[data-help='pt_subtopic_select']",
    "type": "tooltip",
    "title": "Subject Focus",
    "shortDescription": "Pick one subject when Subject Focus mode is active; other modes keep this selector disabled.",
    "detailedContent": "Use Subject Focus when you want every due card and any new introductions to stay inside one subject.",
    "helpArticleSlug": "configuring-practice-test",
    "helpArticleSection": "#step-1-choose-subjects-and-topics",
    "showForNewUsers": "true",
    "showIcon": "true",
    "triggerOnHover": "true",
    "dismissable": "true",
    "isActive": "true",
    "order": 2
  },
  {
    "_id": "pt_question_count",
    "page": "/practice-test/configure",
    "elementRef": "[data-help='pt_question_count']",
    "type": "popover",
    "title": "Question and New-Card Limits",
    "shortDescription": "Max Questions caps the full session; New Cards only fills leftover space when the mode supports introductions.",
detailedContent: "Use 15-30 questions for focused daily practice and increase gradually as your stamina improves."
Max Questions is the hard ceiling for the whole session. New Cards Limit is not added on top of that ceiling.
it only controls how many fresh cards can be introduced after due cards are selected. Review mode ignores new cards.
and Random mode samples existing cards directly.",
helpArticleSlug: "configuring-practice-test",
helpArticleSection: "#step-2-set-question-count",
showForNewUsers: true,
showIcon: true,
triggerOnHover: false,
dismissable: true,
isActive: true,
order: 3
},
{
    _id: "pt_random_cards",
    page: "/practice-test/configure",
    elementRef: "[data-help='pt_random_cards']",
    type: "tooltip",
    title: "Generate Random Cards",
    shortDescription: "Always available deck booster with customizable count.",
    detailedContent: "Use this control anytime to grow your deck without leaving the page. Enter how many cards to add, then click Add random cards."
    This is useful when your deck is small, empty, or when you want extra variety before starting practice.",
helpArticleSlug: "configuring-practice-test",
helpArticleSection: "#step-3-grow-your-deck-with-random-cards",
showForNewUsers: true,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: false,
order: 4
},
{
    _id: "pt_difficulty_dist",
    page: "/practice-test/configure",
    elementRef: "[data-help='pt_difficulty_dist']",
    type: "slide_panel",
    title: "Difficulty Distribution",
    shortDescription: "Deprecated setting from older practice flow.",
    detailedContent: "This help point remains for backward compatibility and is hidden in current UI.",
helpArticleSlug: "configuring-practice-test",
helpArticleSection: null,
showForNewUsers: false,
showIcon: false,
triggerOnHover: false,
dismissable: true,
isActive: false,
order: 4
},
{
    _id: "pt_timer_toggle",
    page: "/practice-test/configure",
    elementRef: "[data-help='pt_timer_toggle']",
    type: "tooltip",
    title: "Timer Setting",
    shortDescription: "Deprecated setting from older practice flow.",
    detailedContent: "This help point remains for backward compatibility and is hidden in current UI.",
helpArticleSlug: "configuring-practice-test",
helpArticleSection: null,
showForNewUsers: false,
showIcon: false,
triggerOnHover: false,
dismissable: true,
isActive: false,
order: 5
},
{
    _id: "pt_immediate_feedback",
    page: "/practice-test/configure",
    elementRef: "[data-help='pt_immediate_feedback']",
    type: "popover",
    title: "Immediate Feedback",
    shortDescription: "Deprecated setting from older practice flow.",
    detailedContent: "This help point remains for backward compatibility and is hidden in current UI.",
helpArticleSlug: "configuring-practice-test",
helpArticleSection: null,
showForNewUsers: false,
showIcon: false,
triggerOnHover: false,
dismissable: true,
isActive: false,
order: 6
},
{
    _id: "pt_shuffle",
    page: "/practice-test/configure",
    elementRef: "[data-help='pt_shuffle']",
    type: "tooltip",
    title: "Randomization",
    shortDescription: "Deprecated setting from older practice flow.",
    detailedContent: "This help point remains for backward compatibility and is hidden in current UI.",
helpArticleSlug: "configuring-practice-test",
helpArticleSection: null,
showForNewUsers: false,
showIcon: false,
triggerOnHover: false,
dismissable: true,
isActive: false,
order: 7
},
{
    _id: "pt_presets",
    page: "/practice-test/configure",
    elementRef: "[data-help='pt_presets']",
    type: "tooltip",
title: "Saved Presets",
shortDescription: "Reuse effective setups with one click.",
detailedContent: null,
helpArticleSlug: "configuring-practice-test",
helpArticleSection: null,
showForNewUsers: false,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: true,
order: 8
},

{
    _id: "me_availability",
    page: "/mock-exam",
    elementRef: "[data-help='me_availability']",
    type: "tooltip",
    title: "Exam Availability",
    shortDescription: "Legacy entry for older mock-exam hub UI.",
    detailedContent: "This help point is currently hidden because the selector is no longer present.",
    helpArticleSlug: "how-mock-exam-works",
    helpArticleSection: null,
    showForNewUsers: false,
    showIcon: false,
    triggerOnHover: false,
    dismissable: true,
    isActive: false,
    order: 1
},

{
    _id: "me_attempts",
    page: "/mock-exam",
    elementRef: "[data-help='me_attempts']",
    type: "tooltip",
    title: "Your Attempts",
    shortDescription: "Tracks attempts and best score for this exam.",
    detailedContent: null,
    helpArticleSlug: "how-mock-exam-works",
    helpArticleSection: null,
    showForNewUsers: true,
    showIcon: true,
    triggerOnHover: true,
    dismissable: true,
    isActive: true,
    order: 2
},

{
    _id: "me_cooldown",
    page: "/mock-exam",
    elementRef: "[data-help='me_cooldown']",
    type: "popover",
    title: "Cooldown Period",
    shortDescription: "Legacy entry for older mock-exam hub UI.",
    detailedContent: "This help point is currently hidden because the selector is no longer present.",
    helpArticleSlug: "how-mock-exam-works",
    helpArticleSection: null,
    showForNewUsers: false,
    showIcon: false,
    triggerOnHover: false,
    dismissable: true,
    isActive: false,
    order: 3
},

{
    _id: "me_readiness",
    page: "/mock-exam",
    elementRef: "[data-help='me_readiness']",
    type: "popover",
    title: "Readiness Score",
    shortDescription: "Legacy entry for older mock-exam hub UI.",
    detailedContent: "This help point is currently hidden because the selector is no longer present.",
    helpArticleSlug: "mock-exam-results",
    helpArticleSection: null,
    showForNewUsers: false,
    showIcon: false,
    triggerOnHover: false,
    dismissable: true,
    isActive: false,
    order: 4
},

{
    _id: "me_percentile",
    page: "/mock-exam",
    elementRef: "[data-help='me_percentile']",
    type: "tooltip",
    title: "Percentile Ranking",
    shortDescription: "Compares your result against all takers.",
    detailedContent: null,
    helpArticleSlug: "mock-exam-results",
    helpArticleSection: "#percentile-explained",
    showForNewUsers: true,
    showIcon: true,
    triggerOnHover: true,
    dismissable: true,
    isActive: true,
    order: 5
},

{
    _id: "me_negative_marking",
    page: "/mock-exam",
    elementRef: "[data-help='me_negative_marking']",
    type: "popover",
    title: "Negative Marking",
shortDescription: "Legacy·entry·for·older·mock-exam·hub·UI.",
detailedContent: "This·help·point·is·currently·hidden·because·the·selector·is·no·longer·present.",
helpArticleSlug: "mock-exam-strategies",
helpArticleSection: null,
showForNewUsers: false,
showIcon: false,
triggerOnHover: false,
dismissable: true,
isActive: false,
order: 6
},

{
    _id: "ex_timer",
    page: "/exam/:id",
    elementRef: "[data-help='ex_timer']",
    type: "tooltip",
    title: "Time·Remaining",
    shortDescription: "Auto-submits·at·zero.",
    detailedContent: null,
    helpArticleSlug: "taking-mock-exam",
    helpArticleSection: null,
    showForNewUsers: true,
    showIcon: true,
    triggerOnHover: true,
    dismissable: true,
    isActive: true,
    order: 1
},
{
    _id: "ex_question_grid",
    page: "/exam/:id",
    elementRef: "[data-help='ex_question_grid']",
    type: "popover",
    title: "Question·Navigator",
    shortDescription: "Color·states·show·answered·and·flagged·questions.",
    detailedContent: "Use·this·grid·to·jump·quickly·and·close·unanswered·gaps·before·submission.",
    helpArticleSlug: "taking-mock-exam",
    helpArticleSection: null,
    showForNewUsers: true,
    showIcon: true,
    triggerOnHover: false,
    dismissable: true,
    isActive: true,
    order: 2
},
{
    _id: "ex_flag",
    page: "/exam/:id",
    elementRef: "[data-help='ex_flag']",
    type: "tooltip",
    title: "Flag·for·Review",
    shortDescription: "Mark·uncertain·items·to·revisit.",
    detailedContent: null,
    helpArticleSlug: "taking-mock-exam",
    helpArticleSection: null,
    showForNewUsers: true,
    showIcon: true,
    triggerOnHover: true,
    dismissable: true,
    isActive: true,
    order: 3
},
{
    _id: "ex_finish_subtest",
    page: "/exam/:id",
    elementRef: "[data-help='ex_finish_subtest']",
    type: "popover",
    title: "Finish·Subtest",
    shortDescription: "You·may·not·be·able·to·go·back.",
    detailedContent: "Review·unanswered·and·flagged·items·before·finishing·current·section.",
    helpArticleSlug: "taking-mock-exam",
    helpArticleSection: null,
    showForNewUsers: true,
    showIcon: true,
    triggerOnHover: false,
    dismissable: true,
    isActive: true,
    order: 4
},
{
    _id: "st_practice_vs_mock",
    page: "/stats",
    elementRef: "[data-help='st_practice_vs_mock']",
    type: "tooltip",
    title: "Practice·vs·Mock·Stats",
    shortDescription: "Tracked·separately·for·learning·and·readiness.",
    detailedContent: null,
    helpArticleSlug: "how-practice-test-works",
    helpArticleSection: null,
    showForNewUsers: true,
    showIcon: true,
    triggerOnHover: true,
    dismissable: true,
    isActive: true,
    order: 1
},
{
    _id: "st_weak_areas",
    page: "/stats",
    elementRef: "[data-help='st_weak_areas']",
    type: "popover",
    title: "Weak·Areas",
shortDescription: "Topics·with·low·accuracy·deserve·focus.",
detailedContent: "Move·weak·topics·into·your·next·3-5·short·practice·sessions.",
helpArticleSlug: "practice-test-results",
helpArticleSection: null,
showForNewUsers: true,
showIcon: true,
triggerOnHover: false,
dismissable: true,
isActive: true,
order: 2
},
{
_id: "st_predicted_score",
page: "/stats",
elementRef: "[data-help='st_predicted_score']",
type: "tooltip",
title: "Predicted Score",
shortDescription: "Estimate·only,·not·official·UPCAT·scoring.",
detailedContent: null,
helpArticleSlug: "mock-exam-results",
helpArticleSection: null,
showForNewUsers: true,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: true,
order: 3
},
{
_id: "gm_xp_bar",
page: "/profile",
elementRef: "[data-help='gm_xp_bar']",
type: "tooltip",
title: "XP to Next Level",
shortDescription: "Track·remaining·XP to·level·up.",
detailedContent: null,
helpArticleSlug: "xp-levels-progress",
helpArticleSection: null,
showForNewUsers: true,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: true,
order: 1
},
{
_id: "gm_streak_mult",
page: "/profile",
elementRef: "[data-help='gm_streak_mult']",
type: "popover",
title: "Streak·Bonus",
shortDescription: "Consecutive·days·multiply·XP·rewards.",
detailedContent: "Even·a·quick·daily·review·keeps·streak·multipliers·alive.",
helpArticleSlug: "xp-levels-progress",
helpArticleSection: null,
showForNewUsers: true,
showIcon: true,
triggerOnHover: false,
dismissable: true,
isActive: true,
order: 2
},
{
_id: "gm_hidden_badge",
page: "/profile",
elementRef: "[data-help='gm_hidden_badge']",
type: "tooltip",
title: "Hidden·Achievement",
shortDescription: "Unlock·by·exploring·and·staying·consistent.",
detailedContent: null,
helpArticleSlug: "achievements-badges",
helpArticleSection: null,
showForNewUsers: false,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: true,
order: 3
},
{
_id: "gm_weekly_challenge",
page: "/profile",
elementRef: "[data-help='gm_weekly_challenge']",
type: "tooltip",
title: "Weekly·Challenge",
shortDescription: "New·goal·each·week·for·bonus·XP.",
detailedContent: null,
helpArticleSlug: "weekly-challenges",
helpArticleSection: null,
showForNewUsers: true,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: true,
order: 4
},
{
_id: "sp_diagnostic",
page: "/study-plan",
elementRef: "[data-help='sp_diagnostic']",
type: "tooltip",
title: "Diagnostic·Test",
shortDescription: "Baseline·test·improves·plan·quality.",
detailedContent: null,
helpArticleSlug: "personalized-study-plan",
helpArticleSection: null,
showForNewUsers: true,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: true,
order: 1
},
{
  _id: "sp_assessment",
  page: "/study-plan",
  elementRef: "[data-help='sp_assessment']",
  type: "popover",
  title: "Module·Assessment",
  shortDescription: "Check·mastery·before·unlocking·next·module.",
  detailedContent: "Failing·an·assessment·usually·triggers·review·reinforcement·and·retry·opportunities.",
  helpArticleSlug: "personalized-study-plan",
  helpArticleSection: null,
  showForNewUsers: true,
  showIcon: true,
  triggerOnHover: false,
  dismissable: true,
  isActive: true,
  order: 2
},
{
  _id: "sp_adaptation",
  page: "/study-plan",
  elementRef: "[data-help='sp_adaptation']",
  type: "tooltip",
  title: "Plan·Adaptation",
  shortDescription: "Plan·updates·based·on·your·current·performance.",
  detailedContent: null,
  helpArticleSlug: "personalized-study-plan",
  helpArticleSection: null,
  showForNewUsers: false,
  showIcon: true,
  triggerOnHover: true,
  dismissable: true,
  isActive: true,
  order: 3
},
{
  _id: "sp_on_track",
  page: "/study-plan",
  elementRef: "[data-help='sp_on_track']",
  type: "tooltip",
  title: "Schedule·Status",
  shortDescription: "Shows·ahead/on-track/behind·pacing.",
  detailedContent: null,
  helpArticleSlug: "personalized-study-plan",
  helpArticleSection: null,
  showForNewUsers: true,
  showIcon: true,
  triggerOnHover: true,
  dismissable: true,
  isActive: true,
  order: 4
},
{
  _id: "set_help_prefs",
  page: "/settings",
  elementRef: "[data-help='set_help_prefs']",
  type: "tooltip",
  title: "Help·Preferences",
  shortDescription: "Control·tooltip·and·onboarding·behavior·globally.",
  detailedContent: null,
  helpArticleSlug: "account-settings",
  helpArticleSection: null,
  showForNewUsers: true,
  showIcon: true,
  triggerOnHover: true,
  dismissable: true,
  isActive: true,
  order: 1
},
{
  _id: "set_replay_tour",
  page: "/settings",
  elementRef: "[data-help='set_replay_tour']",
  type: "tooltip",
  title: "Replay·Tours",
  shortDescription: "Re-run·onboarding·tours·anytime.",
  detailedContent: null,
  helpArticleSlug: "welcome",
  helpArticleSection: null,
  showForNewUsers: false,
  showIcon: true,
  triggerOnHover: true,
  dismissable: true,
  isActive: true,
  order: 2
},
{
  _id: "pay_methods",
  page: "/payment",
  elementRef: "[data-help='pay_methods']",
  type: "tooltip",
  title: "Payment·Methods",
shortDescription: "Choose the most convenient approved channel.",
detailedContent: null,
helpArticleSlug: "premium-features",
helpArticleSection: null,
showForNewUsers: true,
showIcon: true,
triggerOnHover: true,
dismissable: true,
isActive: true,
order: 1
},
{
  _id: "pay_reference",
  page: "/payment",
  elementRef: "[data-help='pay_reference']",
  type: "tooltip",
  title: "Reference Number",
  shortDescription: "Use exact transaction reference for faster validation.",
  detailedContent: null,
  helpArticleSlug: "premium-features",
  helpArticleSection: null,
  showForNewUsers: true,
  showIcon: true,
  triggerOnHover: true,
  dismissable: true,
  isActive: true,
  order: 2
},
{
  _id: "pay_processing",
  page: "/payment",
  elementRef: "[data-help='pay_processing']",
  type: "popover",
  title: "Processing Time",
  shortDescription: "Manual verification may take several hours.",
  detailedContent: "You can monitor status in account payment history after submission.",
  helpArticleSlug: "premium-features",
  helpArticleSection: null,
  showForNewUsers: true,
  showIcon: true,
  triggerOnHover: false,
  dismissable: true,
  isActive: true,
  order: 3
},
];
```

```typescript
const ONBOARDING_FLOWS = [
  {
    _id: "new_user_tour",
    name: "Welcome Tour",
    description: "Two-minute product orientation for first-time users.",
    triggerCondition: "first_login",
    steps: [
      {
        id: "step_1_welcome",
        order: 1,
        target: {type: "full_screen", selector: null, page: null},
        title: "Welcome to UPCAT Simulator!",
        content: "We are here to help you prepare with clarity and confidence. This quick tour takes about two minutes.",
        image: null,
        position: "center",
        primaryAction: {label: "Show Me Around", action: "next", navigateTo: null},
        secondaryAction: {label: "I'll explore on my own", action: "skip"},
        waitForInteraction: false,
        highlightTarget: false,
        allowBackdropClick: false,
      },
      {
        id: "step_2_dashboard",
        order: 2,
        target: {type: "element", selector: "[data-tour='dashboard-main']", page: "/dashboard"},
        title: "This is your dashboard",
        content: "Your main shortcuts, progress cards, and next recommended action live here.",
        image: null,
        position: "bottom",
        primaryAction: {label: "Next", action: "next", navigateTo: null},
        secondaryAction: {label: "Skip Tour", action: "skip"},
        waitForInteraction: false,
        highlightTarget: true,
        allowBackdropClick: false,
      },
      {
        id: "step_3_practice",
        order: 3,
        target: {type: "element", selector: "[data-tour='review-card']", page: "/dashboard"},
        title: "Review sessions for daily learning",
        content: "Use the Review card for flexible drills focused on weak areas and retention.",
        image: null,
        position: "right",
        primaryAction: {label: "Next", action: "next", navigateTo: null},
        secondaryAction: {label: "Skip", action: "skip"},
        waitForInteraction: false,
        highlightTarget: true,
        allowBackdropClick: false,
      },
      {
        id: "step_4_mock",
        order: 4,
        target: {type: "element", selector: "[data-tour='mock-card']", page: "/dashboard"},
        title: "Mock exams simulate the real pressure",
        content: "Use them as readiness checks after focused preparation.",
        image: null,
        position: "right",
primaryAction: {label: "Next", action: "next", navigateTo: null},
secondaryAction: null,
waitForInteraction: false,
highlightTarget: true,
allowBackdropClick: false,
},
{
    id: "step_5_gamification",
    order: 5,
    target: {type: "element", selector: "[data-tour='xp-summary']", page: "/dashboard"},
    title: "Earn XP as you study",
    content: "Consistency builds streaks and multipliers that reward good habits.",
    image: null,
    position: "left",
    primaryAction: {label: "Next", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false,
},
{
    id: "step_6_study_plan",
    order: 6,
    target: {type: "element", selector: "[data-tour='study-plan-card']", page: "/dashboard"},
    title: "Personalized study plan",
    content: "Get a day-by-day path tuned to your strengths and weaknesses.",
    image: null,
    position: "left",
    primaryAction: {label: "Next", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false,
},
{
    id: "step_7_stats",
    order: 7,
    target: {type: "element", selector: "[data-tour='stats-link']", page: "/dashboard"},
    title: "Track progress clearly",
    content: "Use stats to decide what to focus on next, not just to admire scores.",
    image: null,
    position: "bottom",
    primaryAction: {label: "Next", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false,
},
{
    id: "step_8_help",
    order: 8,
    target: {type: "element", selector: "[data-tour='help-link']", page: "/dashboard"},
    title: "Need help?",
    content: "Use the help button and contextual question-mark icons anytime.",
    image: null,
    position: "bottom",
    primaryAction: {label: "Got It", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false,
},
{
    id: "step_9_done",
    order: 9,
    target: {type: "full_screen", selector: null, page: null},
    title: "You're all set",
    content: "Start with a short practice test or begin your diagnostic study-plan flow.",
    image: null,
    position: "center",
    primaryAction: {
        label: "Start a Practice Test",
        action: "navigate",
        navigateTo: "/practice-test/configure"
    },
    secondaryAction: {label: "Go to Dashboard", action: "skip"},
    waitForInteraction: false,
    highlightTarget: false,
    allowBackdropClick: true,
},
],
completionMessage: "You're all set! Happy studying!",
completionAction: {label: "Start Practice", navigateTo: "/practice-test/configure"},
isActive: true,
canBeReplayed: true,
maxDisplayCount: 1,
},
{
    id: "first_practice_tour",
    name: "First Practice Tour",
    description: "Guides user through first practice setup.",
    triggerCondition: "first_practice",
    steps: [
        {
            id: "fp_1",
            order: 1,
            target: {type: "full_screen", selector: null, page: "/practice-test/configure"},
            title: "Let's configure your first practice test",
            content: "We will guide each option and explain what to pick first.",
            image: null,
            position: "center",
            primaryAction: {label: "Let's Go", action: "next", navigateTo: null},
            secondaryAction: {label: "I've got this", action: "skip"},
            waitForInteraction: false,
highlightTarget: false,
allowBackdropClick: false
},
{
    id: "fp_2",
    order: 2,
    target: {
        type: "element",
        selector: "[data-help='pt_subject_select']",
        page: "/practice-test/configure"
    },
    title: "Choose a mode first",
    content: "Your mode decides whether the subject selector and new-card pacing controls are active. Subject Focus unlocks the subject picker; "
    => "Review and Random leave some options disabled on purpose.",
    image: null,
    position: "bottom",
    primaryAction: {label: "Next", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: true,
    highlightTarget: true,
    allowBackdropClick: false
},
{
    id: "fp_3",
    order: 3,
    target: {
        type: "element",
        selector: "[data-help='pt_question_count']",
        page: "/practice-test/configure"
    },
    title: "Size the session",
    content: "Max Questions is the total cap for the whole session. New Cards Limit only fills any leftover space after due cards are chosen, "
    => "and some modes disable it because they do not introduce new cards.",
    image: null,
    position: "bottom",
    primaryAction: {label: "Next", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false
},
{
    id: "fp_4",
    order: 4,
    target: {type: "element", selector: "[data-help='pt_random_cards']", page: "/practice-test/configure"},
    title: "Grow your deck anytime",
    content: "Use Generate random cards to add more cards directly from this screen. Set the count first, then add only what you can realistically review today.",
    image: null,
    position: "right",
    primaryAction: {label: "Next", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false
},
{
    id: "fp_5",
    order: 5,
    target: {type: "element", selector: "[data-help='pt_presets']", page: "/practice-test/configure"},
    title: "Start when ready",
    content: "After sizing and deck prep, start practice with a manageable volume and build consistency first.",
    image: null,
    position: "left",
    primaryAction: {label: "Next", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false
},
{
    id: "fp_6",
    order: 6,
    target: {type: "full_screen", selector: null, page: "/practice-test/configure"},
    title: "You're ready",
    content: "Click start when ready. Focus on learning, not perfection.",
    image: null,
    position: "center",
    primaryAction: {label: "Got It", action: "dismiss", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: false,
    allowBackdropClick: true
},
],
completionMessage: "Great start. You can replay this anytime from Settings.",
completionAction: {label: "Start Practice", navigateTo: "/practice-test/configure"},
isActive: true,
canBeReplayed: true,
maxDisplayCount: 1,
},
{
    _id: "first_mock_tour",
    name: "First Mock Tour",
    description: "Introduces strict mock exam expectations.",
    triggerCondition: "first_mock",
    steps: [
        {
            id: "fm_1",
            order: 1,
            target: {type: "full_screen", selector: null, page: "/dashboard"},
            title: "Mock exams are real simulation",
            content: "These are stricter than practice mode and best for readiness checks.",
            image: null,
            position: "center",
primaryAction: {label: "Tell·Me·More", action: "next", navigateTo: null},
secondaryAction: {label: "I·already·know", action: "skip"},
waitForInteraction: false,
highlightTarget: false,
allowBackdropClick: false
},
{
    id: "fm_2",
    order: 2,
    target: {type: "element", selector: "[data-tour='mock-card']", page: "/dashboard"},
    title: "Start·from·your·dashboard",
    content: "Use·the·Mock·Exam·card·to·run·full·timed·simulations·when·you·are·warmed·up.",
    image: null,
    position: "center",
    primaryAction: {label: "Understood", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: false
},
{
    id: "fm_3",
    order: 3,
    target: {type: "element", selector: "[data-tour='mock-card']", page: "/dashboard"},
    title: "Before·you·start",
    content: "Prepare·stable·connection, full·time·block, and·quiet·environment.",
    image: null,
    position: "center",
    primaryAction: {label: "Got·It", action: "next", navigateTo: null},
    secondaryAction: null,
    waitForInteraction: false,
    highlightTarget: true,
    allowBackdropClick: true
},
],
completionMessage: "Good·luck·on·your·first·simulation!",
completionAction: {label: "Back·to·Dashboard", navigateTo: "/dashboard"},
isActive: true,
canBeReplayed: true,
maxDisplayCount: 1,
},
{
    id: "gamification_intro",
    name: "Gamification·Intro",
    description: "Appears·when·user·first·earns·XP.",
    triggerCondition: "first_xp_earned",
    steps: [
        {
            id: "gx_1",
            order: 1,
            target: {type: "element", selector: "[data-tour='xp-earned']", page: "/results"},
            title: "You·earned·XP",
            content: "XP·rewards·your·consistency·and·effort.",
            image: null,
            position: "top",
            primaryAction: {label: "Tell·Me·More", action: "next", navigateTo: null},
            secondaryAction: {label: "Nice", action: "skip"},
            waitForInteraction: false,
            highlightTarget: true,
            allowBackdropClick: false
        },
        {
            id: "gx_2",
            order: 2,
            target: {type: "element", selector: "[data-help='gm_streak_mult']", page: "/profile"},
            title: "Streak·multiplier",
            content: "Daily·study·increases·XP·multiplier·over·time.",
            image: null,
            position: "right",
            primaryAction: {label: "Next", action: "next", navigateTo: null},
            secondaryAction: null,
            waitForInteraction: false,
            highlightTarget: true,
            allowBackdropClick: false
        },
        {
            id: "gx_3",
            order: 3,
            target: {type: "element", selector: "[data-help='gm_xp_bar']", page: "/profile"},
            title: "Level·up",
            content: "As·XP·accumulates, you·unlock·higher·titles·and·milestones.",
            image: null,
            position: "right",
            primaryAction: {label: "Challenge·Accepted", action: "dismiss", navigateTo: null},
            secondaryAction: null,
            waitForInteraction: false,
            highlightTarget: true,
            allowBackdropClick: true
        }
    ],
}
completionMessage: "Keep going. Small daily wins compound quickly.",
completionAction: {label: "View Profile", navigateTo: "/profile"},
isActive: true,
canBeReplayed: true,
maxDisplayCount: 2,
};
```

```typescript
function normalizeArticle(articleInput, now, adminId) {
  return {
    ...articleInput,
    ...lastUpdatedAt: now,
    ...updatedBy: adminId ?? null,
    ...viewCount: 0,
    ...helpfulCount: 0,
    ...notHelpfulCount: 0,
  };
}

export async function seedHelpSystem(db, options = {}){
  const now = options.now ?? new Date();
  const adminId = options.adminId ?? null;

  const missing = REQUIRED_SLUGS.filter(
    (slug) => !HELP_ARTICLES.some((articleRow) => articleRow.slug === slug),
  );
  if (missing.length > 0) {
    throw new Error(`seed-help.js is missing required articles: ${missing.join(",")}`);
  }

  for (const category of HELP_CATEGORIES) {
    await db.collection("help_categories").updateOne(
      {id: category._id},
      {$set: {...category, updatedAt: now}, $setOnInsert: {createdAt: now}},
      {upsert: true},
    );
  }

  for (const row of HELP_ARTICLES) {
    await db.collection("help_articles").updateOne(
      {slug: row.slug},
      {
        $set: {
          ...normalizeArticle(row, now, adminId),
          ...updatedAt: now,
        },
        $setOnInsert: {
          ...createdAt: now,
        },
        {upsert: true},
      },
    );
  }

  for (const row of CONTEXTUAL_HELP) {
    await db.collection("contextual_help").updateOne(
      {id: row._id},
      {
        $set: {
          ...row,
          ...updatedAt: now,
          ...updatedBy: adminId,
        },
        $setOnInsert: {
          ...createdAt: now,
        },
        {upsert: true},
      },
    );
  }

  for (const flow of ONBOARDING_FLOWS) {
    await db.collection("onboarding_flows").updateOne(
      {id: flow._id},
      {
        $set: {
          ...flow,
          ...updatedAt: now,
          ...updatedBy: adminId,
        },
        $setOnInsert: {
          ...createdAt: now,
        },
        {upsert: true},
      },
    );
  }

  return {
    categories: HELP_CATEGORIES.length,
    articles: HELP_ARTICLES.length,
    contextualHelp: CONTEXTUAL_HELP.length,
    onboardingFlows: ONBOARDING_FLOWS.length,
  };
}