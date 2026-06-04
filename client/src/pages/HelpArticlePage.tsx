<h1 className="mt-3 text-3xl font-bold text-slate-900">{article.title}</h1>
{article.subtitle && <p className="mt-2 text-sm text-slate-700">{article.subtitle}</p>}

{Array.isArray(article.quickFacts) && article.quickFacts.length > 0 && (
  <section className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
    <h2 className="text-sm font-semibold text-indigo-900">Quick Facts</h2>
    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
      {article.quickFacts.map(({ fact: { label: string; value: string } }) => (
        <div key={fact.label} className="rounded-md bg-white px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-slate-500">{fact.label}</dt>
          <dd className="text-sm font-medium text-slate-900">{fact.value}</dd>
        </div>
      ))}
    </dl>
  </section>
)}

<div className="prose prose-slate mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: html }}>

{Array.isArray(article.fags) && article.fags.length > 0 && (
  <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
    <div className="mc-3 space-y-2">
      {article.fags.map(({ faq: { question: string; answer: string } }) => (
        <details key={faq.question} className="rounded-lg border border-slate-200 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-slate-900">{faq.question}</summary>
          <p className="mt-2 text-sm text-slate-700">{faq.answer}</p>
        </details>
      ))}
    </div>
  </section>
)}

{related.length > 0 && (
  <section className="mt-8">
    <h2 className="text-lg font-semibold text-slate-900">Related Articles</h2>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {related.map((item) => (
        <Link key={item.slug} to={`/help/article/${item.slug}`}>
          <div className="rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
            <p className="text-sm font-medium text-slate-900">{item.title}</p>
            {item.subtitle && <p className="text-xs text-slate-600">{item.subtitle}</p>}
          </div>
        </Link>
      ))}
    </div>
  </section>
)}

<section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
  <h2 className="text-sm font-semibold text-slate-900">Was this article helpful?</h2>
  {feedbackState === "sent" ? (
    <p className="mt-2 text-sm text-emerald-700">Thanks for the feedback.</p>
  ) : (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => void sendFeedback(true)}>
        Yes
      </button>
      <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => void sendFeedback(false)}>
        No
      </button>
    </div>
    <textarea
      value={notHelpfulComment}
      onChange={(event) => setNotHelpfulComment(event.target.value)}
      className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      rows={3}
      placeholder="Optional: tell us what was missing"
    />
  )}
</section>

<div className="mt-6 flex flex-wrap gap-4 text-sm">
  <Link to="/help" className="font-medium text-indigo-700 hover:underline">Back to Help Center</Link>
  {isAdmin && <Link to="/admin/help/articles" className="text-slate-700 hover:underline">Edit this article</Link>}
</div>

<aside className="hidden lg:block">
  <div className="sticky-top-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-900">Table of Contents</h2>
    <ul className="mt-3 space-y-1">
      {headings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "pl-3" : ""}>
          <a href={`#${heading.id}`} className="text-xs text-slate-600 hover:text-indigo-700">
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  </div>
</aside>