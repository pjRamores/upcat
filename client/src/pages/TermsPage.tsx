import {Link} from "react-router-dom";
import Seo from "@/components/Seo";

/**
 * Terms and Conditions
 * Note: This document is provided for general informational
 * purposes only and does not constitute legal advice.
 */

const LAST_UPDATED = "May 11, 2026";

const SECTIONS = [
    {id: "acceptance", title: "1. Acceptance of Terms"},
    {id: "service", title: "2. Description of Service"},
    {id: "accounts", title: "3. User Accounts"},
    {id: "use", title: "4. Acceptable Use"},
    {id: "ip", title: "5. Intellectual Property"},
    {id: "disclaimers", title: "6. Disclaimers"},
    {id: "liability", title: "7. Limitation of Liability"},
    {id: "termination", title: "8. Termination"},
    {id: "changes", title: "9. Changes to Terms"},
    {id: "law", title: "10. Governing Law"},
    {id: "contact", title: "11. Contact Information"},
];

export default function TermsPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-12">
            <Seo
                title="Terms and Conditions | UPCAT Simulator"
                description="Read the terms and conditions for using UPCAT Simulator, our UPCAT practice platform."
                bare
            />
            <header className="border-b border-gray-200 pb-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
                    Legal
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
                    Terms and Conditions
                </h1>
                <p className="mt-3 text-sm text-gray-500">
                    Last updated: <time>{LAST_UPDATED}</time>
                </p>
            </header>

            {/* Table of Contents */}
            <nav
                aria-label="Table of contents"
                className="mt-8 rounded-2xl border border-gray-200 bg-white p-6"
            >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Contents
                </h2>
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                    {SECTIONS.map((s) => (
                        <li key={s.id}>
                            <a
                                href={`#${s.id}`}
                                className="block rounded-md px-2 py-1 text-sm text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                            >
                                {s.title}
                            </a>
                        </li>
                    ))}
                </ol>
            </nav>

            {/* Body */}
            <article className="legal-prose mt-10 space-y-12 text-gray-800">
                <Section id="acceptance" title="1. Acceptance of Terms">
                    <p>
                        By accessing or using the UPCAT Simulator service (the
                        &ldquo;Service&rdquo;), you (&ldquo;User&rdquo;) acknowledge that
                        you have read, understood, and agree to be bound by these Terms
                        and Conditions (&ldquo;Terms&rdquo;). If you do not agree to any
                        portion of these Terms, you must discontinue use of the Service
                        immediately.
                    </p>
                    <p>
                        These Terms constitute a legally binding agreement between you
                        and the operator of the Service. Your continued use of the
                        Service following any modification to these Terms shall
                        constitute acceptance of such modifications.
                    </p>
                </Section>

                <Section id="service" title="2. Description of Service">
                    <p>
                        UPCAT Simulator is an{" "}
                        <strong>independent online practice platform</strong> designed to
                        help users prepare for the University of the Philippines College
                        Admission Test (UPCAT). The Service provides simulated practice
                        examinations, performance analytics, and review materials for
                        educational purposes only.
                    </p>
                    <p>
                        The Service is hosted on <strong>cloud computing infrastructure</strong>
                        and uses a <strong>managed cloud database service</strong> for
                        data storage. These platforms provide the underlying infrastructure
                        for availability, security, and performance. See our{" "}
                        <Link
                            to="/privacy"
                            className="font-medium text-primary-600 underline-offset-2 hover:underline"
                        >
                            Privacy Policy
                        </Link>{" "}
                        for more details on how your data is handled.
                    </p>
                    <p>
                        <strong>
                            The Service is not the actual UPCAT examination
                        </strong>{" "}
                        and does not in any way replicate or reproduce official UPCAT
                        content. All questions, passages, and materials provided through
                        the Service are original works or items inspired by public-domain
                        educational resources.
                    </p>
                    <p>
                        <strong>No Guarantee of Performance.</strong> The Operator makes
                        no representations, warranties, or guarantees, express or
                        implied, regarding any User&rsquo;s performance on the actual
                        UPCAT examination or admission to any academic institution. Use
                        of the Service does not guarantee any particular score, outcome,
                        or result.
                    </p>
                </Section>

                <Section id="accounts" title="3. User Accounts">
                    <p>
                        To access certain features of the Service, you must register for
                        an account. By creating an account, you represent and warrant
                        that:
                    </p>
                    <ul>
                        <li>
                            All information provided is true, accurate, current, and
                            complete;
                        </li>
                        <li>You will maintain and promptly update such information;</li>
                        <li>
                            If you are a minor, you have obtained the consent of a parent
                            or legal guardian;
                        </li>
                        <li>
                            You will register and maintain only{" "}
                            <strong>one (1) account per individual</strong>.
                        </li>
                    </ul>
                    <p>
                        You are solely responsible for safeguarding the credentials used
                        to access your account and for any activity occurring under your
                        account, whether or not authorized. You agree to notify the
                        Operator immediately of any unauthorized use of your account or
                        any other breach of security.
                    </p>
                </Section>

                <Section id="use" title="4. Acceptable Use">
                    <p>You agree NOT to engage in any of the following activities:</p>
                    <ul>
                        <li>
                            Sharing your account credentials with any other person or
                            permitting another person to access the Service through your
                            account;
                        </li>
                        <li>
                            Scraping, harvesting, or otherwise extracting questions,
                            passages, rationales, or other content from the Service through
                            automated means or otherwise;
                        </li>
                        <li>
                            Using the Service or any content obtained therefrom for any
                            commercial purpose, including but not limited to reselling,
                            redistributing, or incorporating such content into competing
                            products;
                        </li>
                        <li>
                            Reverse-engineering, decompiling, or attempting to derive the
                            source code of the Service;
                        </li>
                        <li>
                            Interfering with, disrupting, or attempting to gain
                            unauthorized access to the Service, its servers, or related
                            systems;
                        </li>
                        <li>
                            Using the Service to engage in any unlawful, fraudulent, or
                            harmful conduct.
                        </li>
                    </ul>
                    <p>
                        Violation of any provision of this Section may result in
                        immediate suspension or termination of your account.
                    </p>
                </Section>

                <Section id="ip" title="5. Intellectual Property">
                    <p>All content made available through the Service, including but not limited to text, graphics,
                        logos, icons, images, audio clips, video clips, data compilations, software, questions, answer
                        choices, rationales, and arrangements thereof (collectively, the "Content"), is the exclusive
                        property of the Operator or its licensors and is protected by applicable Philippine and
                        international intellectual property laws.</p>
                    <p>
                        Subject.to.your.continued.compliance.with.these.Terms,the
                        Operator.grants.you.a.limited.non-exclusive.non-transferable,
                        revocable.license.to.access.and.use.the.Service.and.Content
                        solely.for.your.personal.non-commercial.educational.purposes.
                        No.other.rights.are.granted.expressly.or.by.implication.

                    </p>
                </Section>

                <Section id="disclaimers" title="6.Disclaimers">
                    <p>
                        <strong>
                            THE.SERVICE.IS.PROVIDED.ON.AN.&ldquo;AS.IS&rdquo;.AND
                            &ldquo;AS.AVAILABLE&rdquo;.BASIS.WITHOUT.WARRANTIES.OF.ANY
                            KIND.EITHER.EXPRESS.OR.IMPLIED,
                        </strong>{" "}
                        including.without.limitation.implied.warranties.of
                        merchantability.fitness.for.a.particular.purpose,
                        non-infringement.or.course.of.performance.
                    </p>
                    <p>
                        <strong>No.Affiliation.</strong>The.Service.is{" "}
                        <strong>not.affiliated.with,.endorsed.by,.sponsored.by,.or</strong>
                        otherwise.connected.to
                        <the.University.of.the
                            Philippines
                        ,the.UPCAT.examination,or.any.of.their
                        administrators.employees.or.contractors.Any.references.to
                        &ldquo;UPCAT&rdquo;.or.related.terminology.are.for.descriptive
                        and.educational.purposes.only.
                    </p>
                    <p>
                        <strong>Original.or.Public-Domain.Material.</strong>All
                        questions.and.content.provided.through.the.Service.are
                        original.works.created.for.educational.purposes.or.are.derived
                        from.materials.in.the.public.domain.No.actual.UPCAT.content,
                        past.or.present.is.reproduced.
                    </p>
                </Section>

                <Section id="liability" title="7.Limitation.of.Liability">
                    <p>
                        To.the.maximum.extent.permitted.by.applicable.law.in.no.event
                        shall.the.Operator.its.affiliates.officers.employees.agents,
                        or.licensees.be.liable.for.any.indirect.incidental.special,
                        consequential.exemplary.or.punitive.damages.including.but.not
                        limited.to.damages.for.loss.of.profits.goodwill.data.or.other
                        intangible.losses.arising.out.of.or.in.connection.with.your.use
                        of.or.inability.to.use.the.Service.
                    </p>
                    <p>
                        In.any.event.the.aggregate.liability.of.the.Operator.arising
                        out.of.or.relating.to.these.Terms.shall.not.exceed.the.amount
                        paid.by.you.(if.any).to.use.the.Service.in.the.twelve.(12)
                        months.preceding.the.event.giving.rise.to.the.claim.If.you.have
                        paid.nothing.for.the.Service.the.Operator&rsquo;s.aggregate
                        liability.shall.not.exceed.PHP.500.
                    </p>
                </Section>

                <Section id="termination" title="8.Termination">
                    < p>
                        The.Operator.reserves.the.right.in.its.sole.discretion.to
                        suspend.restrict.or.terminate.your.access.to.the.Service.and
                        your.account.with.or.without.notice.for.any.reason.including
                        but.not.limited.to.(i).breach.of.these.Terms.(ii).conduct.that
                        the.Operator.deems.harmful.to.the.Service.or.other.users.or
                        (iii).prolonged.inactivity.
                    </p>
                    <p>
                        Upon.termination.your.right.to.use.the.Service.will.cease
                        immediately.Sections.5.(Intellectual.Property).6
                        (Disclaimers).7.(Limitation.of.Liability).and.10.(Governing
                        Law).shall.survive.any.termination.of.these.Terms.
                    </p>
                </Section>

                <Section id="changes" title="9.Changes.to.Terms">
                    <p>
                        The.Operator.may.modify.these.Terms.at.any.time.by.posting.the
                        revised.Terms.at.this.URL.and.updating.the.&ldquo;Last
                        updated&rdquo;.date.above.Material.changes.will.be
                        communicated.through.the.Service.or.via.the.email.address
                        associated.with.your.account.where.reasonably.practicable.
                    </p>
                    <p>
                        Your.continued.use.of.the.Service.after.such.modifications.take
                        effect.shall.constitute.your.acceptance.of.the.revised.Terms.
                    </p>
                </Section>

                <Section id="law" title="10.Governing.Law">
                    <p>
                        These.Terms.shall.be.governed.by.and.constructed.in.accordance
                        with.the.laws.of.the.Republic.of.the.Philippines.without
                        regard.to.its.conflict.of.laws.principles.You.agree.that.any
                        legal.action.or.proceeding.arising.out.of.or.relating.to.these
                        Terms.or.your.use.of.the.Service.shall.be.brought.exclusively
                        in.the.competent.courts.located.in.Quezon.City.Metro.Manila,
                        Philippines.and.you.hereby.submit.to.the.personal.jurisdiction
                        of.such.courts.
                    </p>
                </Section>

                <Section id="contact" title="11.Contact.Information">
                    <p>
                        If.you.have.any.questions.concerns.or.complaints.regarding
                    </p>
                </Section>
            </article>
        </div>
    );
}

function Section({
                     id,
                     title,
                     children,
                 }: {
    id: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
            <h2 id={`${id}-h`}
                className="text-xl font-bold tracking-tight text-gray-900">{title}</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-7 text-gray-700">{children}</div>
        </section>
    );
}
