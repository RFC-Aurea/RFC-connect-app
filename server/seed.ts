import { db } from "./db";
import { users, resources, patientPhases, mentorAssignments, messages, reports, chatAttachments, notifications, auditLog, refreshTokens } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const DISCLAIMER =
  "\n\nThis is peer support content and not medical advice. Always consult your RFC clinical team for guidance specific to your situation.";

const seedResources = [
  // ─── Pre-Consult & Decision ───────────────────────────────────────────────
  {
    phase: "Pre-Consult & Decision",
    title: "Your First Consult: What to Ask and How to Prepare",
    category: "Preparation",
    type: "guide",
    readTime: "5 min read",
    summary:
      "A checklist of questions to bring to your initial RFC consultation so you feel confident and prepared.",
    content:
      `Coming to your first consult prepared helps you get the most from your time with your RFC doctor. Before your appointment, write down your complete cycle history — note your cycle length, any irregularities, and how long you've been trying. Compile a list of all medications and supplements you're currently taking, and jot down any previous fertility tests or treatments you've had elsewhere.

Come with your questions written down. Good ones to start with: What type of IVF (Natural, Mini, or Conventional) might be right for me based on my history? What diagnostic tests do you recommend before starting? What does my timeline look like? Don't hesitate to ask about anything that feels confusing — your RFC team welcomes questions and wants you to leave feeling clear.

Learn more about the IVF journey at RFC here: https://www.rejuvenatingfertility.com/your-ivf-journey` +
      DISCLAIMER,
  },
  {
    phase: "Pre-Consult & Decision",
    title: "Understanding IVF Costs and Financial Options",
    category: "Financial Planning",
    type: "guide",
    readTime: "6 min read",
    summary:
      "Breaking down IVF pricing, insurance, and financing options available at RFC.",
    content:
      `The cost of IVF can feel daunting, but RFC is committed to transparent pricing with no hidden fees. Your total cost will depend on which protocol is recommended for you, whether medications are included, and whether you need additional services like genetic testing or an ERA. Your care coordinator can walk you through an itemized estimate before you commit to anything.

RFC's Connecticut location accepts many insurance plans — it's worth a call to your carrier to verify your coverage before your first appointment. For those without coverage or with partial coverage, RFC partners with CapexMD, a financing option that offers payment plans specifically designed for fertility treatment.

Explore all of RFC's affording care options here: https://www.rejuvenatingfertility.com/affording-care` +
      DISCLAIMER,
  },
  {
    phase: "Pre-Consult & Decision",
    title: "Which IVF Type Is Right for You? Natural, Mini, or Conventional",
    category: "Medical Info",
    type: "article",
    readTime: "7 min read",
    summary:
      "RFC offers three personalized IVF approaches — here's how to think about which one fits your situation.",
    content:
      `One of the things that makes RFC different is that they offer three distinct IVF approaches rather than a one-size-fits-all protocol. Natural IVF works with your body's own cycle without stimulation injections — it's gentler and best for certain patient profiles, particularly those with very low reserve or who have reacted poorly to medications in the past.

Mini/Gentle IVF uses oral medications and minimal injections to stimulate a modest number of follicles. It's a middle ground that reduces medication burden and cost while still increasing egg numbers beyond a natural cycle. Conventional IVF uses 2-3 daily injection medications to maximize follicle production and is often recommended for patients who need or want more eggs per retrieval.

Your RFC doctor will review your bloodwork, history, and goals to recommend the best fit. You can read more about RFC's IVF options here: https://www.rejuvenatingfertility.com/ivf-options` +
      DISCLAIMER,
  },
  {
    phase: "Pre-Consult & Decision",
    title: "Emotional Readiness: Preparing Your Heart for This Journey",
    category: "Emotional Support",
    type: "article",
    readTime: "5 min read",
    summary:
      "It's okay to feel scared, hopeful, and overwhelmed all at once. Here's how other patients navigated those early emotions.",
    content:
      `Starting an IVF journey can bring up a rush of emotions all at once — hope, fear, grief for the path you thought you'd have, excitement for what's possible. All of those feelings are completely valid, and you don't have to resolve them before you begin. Many patients find that simply naming what they're feeling helps it feel more manageable.

If you have a partner, this is a good time to talk openly about how each of you processes stress differently. One of you might want to talk about every appointment; the other might want to compartmentalize. Neither approach is wrong — knowing each other's style helps you show up for each other without friction during the harder stretches.

Setting limits with well-meaning family members who ask constantly for updates can also protect your emotional bandwidth. You don't owe anyone a timeline or a running commentary on your cycle. It's okay to say, "We'll share news when we have something to share."` +
      DISCLAIMER,
  },
  {
    phase: "Pre-Consult & Decision",
    title: "Fertility Terminology Glossary",
    category: "Medical Info",
    type: "guide",
    readTime: "4 min read",
    summary:
      "AMH, FSH, ICSI, PGT... a plain-English guide to the terms you'll hear throughout your treatment.",
    content:
      `Walking into your first appointment can feel like entering a foreign country where everyone speaks a different language. Here are the most common terms you'll encounter: AMH (Anti-Müllerian Hormone) measures ovarian reserve — how many eggs you likely have remaining. FSH (Follicle-Stimulating Hormone) measures how hard your brain is working to recruit eggs, which rises as reserve declines. IVF (In Vitro Fertilization) means fertilization happens outside the body in a lab. ICSI (Intracytoplasmic Sperm Injection) means a single sperm is injected directly into an egg.

A few more essentials: PGT (Preimplantation Genetic Testing) screens embryos for chromosomal abnormalities before transfer. ERA (Endometrial Receptivity Analysis) tests whether your lining is ready to receive an embryo on the standard timing. HSG (Hysterosalpingogram) is an X-ray test to check if your fallopian tubes are open. TWW is the Two-Week Wait between transfer and pregnancy test. Beta is the blood HCG test that tells you if you're pregnant.

More terms you'll hear: RE is your Reproductive Endocrinologist (fertility doctor). Stims are the stimulation medications used to grow follicles. Trigger shot is the injection that triggers final egg maturation before retrieval. Blastocyst is an embryo that has developed to day 5 or 6. FET stands for Frozen Embryo Transfer. Learn more about fertility topics at: https://www.rejuvenatingfertility.com/fertility-issues` +
      DISCLAIMER,
  },

  // ─── Testing & Diagnosis ─────────────────────────────────────────────────
  {
    phase: "Testing & Diagnosis",
    title: "Understanding Your Bloodwork: AMH, FSH, and What the Numbers Mean",
    category: "Medical Info",
    type: "article",
    readTime: "6 min read",
    summary:
      "Your blood test results can feel like a foreign language. Here's what your RFC team is looking at and why.",
    content:
      `Your initial bloodwork gives your RFC doctor a window into your ovarian reserve and hormone levels. AMH (Anti-Müllerian Hormone) reflects the number of egg-producing follicles remaining — a lower number indicates lower reserve, but it doesn't tell you everything about egg quality or your chances of success. RFC specializes in patients with low AMH and has achieved pregnancies in patients other clinics turned away.

FSH (Follicle-Stimulating Hormone) is typically measured on cycle day 3. A high FSH means your brain is working harder to stimulate your ovaries, which can signal diminished reserve. Estradiol is also checked on day 3 — an elevated level can suppress FSH and give a falsely normal reading. Your RFC doctor looks at all these numbers together, never in isolation.

Remember that bloodwork gives a snapshot, not a complete story. Many patients with challenging numbers have had successful retrievals at RFC. Learn more about what RFC evaluates here: https://www.rejuvenatingfertility.com/fertility-issues` +
      DISCLAIMER,
  },
  {
    phase: "Testing & Diagnosis",
    title: "What to Expect from Your HSG Test",
    category: "Preparation",
    type: "guide",
    readTime: "4 min read",
    summary:
      "The HSG checks if your fallopian tubes are open. Here's what the procedure involves and how to prepare.",
    content:
      `An HSG (Hysterosalpingogram) is an X-ray procedure that checks whether your fallopian tubes are open and your uterine cavity looks normal. A contrast dye is injected through the cervix and its movement is tracked under X-ray in real time. The whole thing typically takes 15-30 minutes and is done in an outpatient setting, often a radiology center.

Many patients describe HSG discomfort as ranging from mild cramping to more significant pressure — everyone's experience is different. Taking an over-the-counter pain reliever about an hour beforehand can help. Plan to have someone drive you home, and expect light spotting for a day or two after, which is completely normal.

Results are usually available right away — your RFC doctor will review them with you and explain what they mean for your treatment plan. Learn more about uterine and tube health at RFC: https://www.rejuvenatingfertility.com/uterine-tube-health` +
      DISCLAIMER,
  },
  {
    phase: "Testing & Diagnosis",
    title: "Semen Analysis: What Your Partner Needs to Know",
    category: "Medical Info",
    type: "article",
    readTime: "5 min read",
    summary:
      "Male factor fertility is involved in roughly half of cases. Here's what the semen analysis looks at.",
    content:
      `Male factor fertility plays a role in roughly half of all infertility cases, which is why a semen analysis is standard in any fertility workup. The analysis looks at three main parameters: count (how many sperm are present), motility (what percentage are actively swimming forward), and morphology (what percentage have a normal shape). All three matter for fertilization.

Results can feel personal and sensitive for many partners. It may help to frame the results as information, not identity — sperm quality is influenced by many modifiable factors including heat exposure, stress, smoking, certain medications, and even recent illness. Changes in lifestyle and targeted supplements can sometimes improve parameters given a few months' lead time.

At RFC, sperm collection happens on retrieval day at the clinic. If there are concerns about sperm quality, your RFC team will discuss options including ICSI, which is used with most IVF cycles and helps maximize fertilization even when sperm parameters are less than ideal.` +
      DISCLAIMER,
  },
  {
    phase: "Testing & Diagnosis",
    title: "Coping with a Difficult Diagnosis",
    category: "Emotional Support",
    type: "article",
    readTime: "6 min read",
    summary:
      "Hearing words like 'low reserve' or 'unexplained infertility' can be devastating. You're not alone in this.",
    content:
      `Hearing terms like "diminished ovarian reserve," "poor responder," or "unexplained infertility" can feel like a door closing. It's okay to sit with that grief — to feel angry, devastated, or blindsided. A diagnosis is hard news, and you don't have to immediately pivot to problem-solving mode. Give yourself permission to feel it first.

What I want you to know from the other side: a diagnosis is a starting point, not an ending. RFC was built specifically for the hard cases — their Natural and Mini IVF protocols were developed for patients who don't respond to conventional stimulation or who have been told their numbers are "too low." There are paths forward that didn't exist even a few years ago, and RFC's team has walked many patients through situations that felt impossible.

Lean on your RFC care team, your mentor, and the people in your life who can sit with you in the hard parts. You don't have to have hope every single day — that's what your support system is for. Learn more about fertility issues RFC addresses here: https://www.rejuvenatingfertility.com/fertility-issues` +
      DISCLAIMER,
  },
  {
    phase: "Testing & Diagnosis",
    title: "Your Testing Timeline: What Happens When",
    category: "Preparation",
    type: "guide",
    readTime: "4 min read",
    summary:
      "From your first appointment to starting treatment, here's the typical testing timeline at RFC.",
    content:
      `After your initial consultation at RFC, there's typically a structured sequence of tests before your treatment plan is finalized. Understanding this timeline helps reduce the feeling of uncertainty and lets you plan around appointments and work schedules rather than being caught off guard.

The typical sequence: initial consultation (discusses your history and goals and may include a baseline ultrasound), day 3 bloodwork (AMH, FSH, estradiol, and antral follicle count via ultrasound to assess ovarian reserve), HSG (uterine cavity and tube evaluation, scheduled in the first half of your cycle), semen analysis if applicable, and then a follow-up appointment to review all results and finalize your protocol.

Some tests may happen at the same visit; others require specific cycle timing. Your RFC care coordinator will help you navigate the scheduling and explain what to do if timing doesn't align with your cycle. Learn more about the IVF journey at RFC: https://www.rejuvenatingfertility.com/your-ivf-journey` +
      DISCLAIMER,
  },

  // ─── Stimulation ─────────────────────────────────────────────────────────
  {
    phase: "Stimulation",
    title: "Injection Tips from Someone Who's Been There",
    category: "Practical Tips",
    type: "guide",
    readTime: "5 min read",
    summary:
      "Needle anxiety is real. Here are tried-and-true tips from RFC mentors who made it through stims.",
    content:
      `If needle anxiety is keeping you up at night, you're not alone — it's one of the most common fears patients bring to this process. The good news is that most patients find the injections much easier than they anticipated, especially once the first few nights are behind them and the routine becomes familiar.

A few tips that made a real difference: let your medications reach room temperature before injecting — cold liquid stings more. Icing the injection site for a minute or two beforehand can reduce sensation significantly. Watch injection technique videos before your first night so the mechanics feel familiar. Alternate injection sides each evening, and try to stick to the same time of day to keep hormone levels stable.

Freedom Med Teach has excellent injection tutorial videos used by many RFC patients — bookmark it before stims start: https://www.freedommedteach.com/eng/` +
      DISCLAIMER,
  },
  {
    phase: "Stimulation",
    title: "Managing Bloat, Mood Swings, and Stims Side Effects",
    category: "Emotional Support",
    type: "article",
    readTime: "6 min read",
    summary:
      "Stimulation hormones can make you feel like a different person. Here's how to stay comfortable.",
    content:
      `Stimulation medications flood your body with hormones to help follicles grow, and your body will let you know it. Bloating is one of the most common complaints — especially as follicles enlarge toward the end of stims. Loose, comfortable clothing is your best friend during this phase. Salty foods and electrolyte drinks like coconut water or Pedialyte can help manage fluid retention, and gentle walks can reduce discomfort.

Mood swings are real and can catch both you and your partner off guard. This isn't weakness — it's chemistry. Lowering your expectations for productivity and social commitments during stims is not giving up; it's smart self-care. Give your partner a heads-up that this phase can be emotionally turbulent and ask for extra patience on both sides.

Knowing when to call the clinic matters too. Mild symptoms are expected, but if you experience severe abdominal pain, sudden dramatic weight gain, or difficulty breathing, call RFC immediately — these can be signs of Ovarian Hyperstimulation Syndrome (OHSS), which requires prompt evaluation. Don't wait to see if it passes on its own.` +
      DISCLAIMER,
  },
  {
    phase: "Stimulation",
    title: "What Happens at Monitoring Appointments",
    category: "Medical Info",
    type: "article",
    readTime: "4 min read",
    summary:
      "You'll come in for ultrasounds and bloodwork during stims. Here's what your team is tracking.",
    content:
      `During stimulation, you'll come into RFC for monitoring appointments — typically every 1-3 days depending on your response. These appointments involve a quick transvaginal ultrasound and bloodwork. They usually happen in the morning and take 30-45 minutes, so many patients go before work.

At each appointment, your care team is measuring follicle count and size (ideally reaching 18-20mm before retrieval), estradiol levels (which rise as follicles grow and help your team assess overall response), and uterine lining thickness. Based on these results, they may adjust your medication doses — increasing stimulation, adding a blocker to prevent premature ovulation, or determining that you're ready for the trigger shot.

RFC has five locations to make monitoring as convenient as possible for where you live and work. Find the location closest to you: https://www.rejuvenatingfertility.com/locations` +
      DISCLAIMER,
  },
  {
    phase: "Stimulation",
    title: "Medication Storage and Handling 101",
    category: "Practical Tips",
    type: "guide",
    readTime: "3 min read",
    summary:
      "Some meds need refrigeration, some don't. Here's how to keep everything organized and safe.",
    content:
      `Stims medications can feel overwhelming when they first arrive — multiple vials, mixing instructions, and different storage requirements. Taking an hour to organize everything before you start makes the daily routine much smoother and reduces the chance of errors when you're tired at 9pm.

Most injectable stimulation medications require refrigeration and should be kept between 36-46°F (2-8°C). Some medications, like cetrotide or ganirelix, can be stored at room temperature. Always check the specific instructions that come with each medication and confirm with your RFC pharmacy if you're unsure. Mix medications just before injecting and never leave a mixed, filled syringe unused overnight.

For staying on schedule, many patients use a simple notebook where they log time and dose each evening, or set a phone alarm at the same time daily. If you're traveling during stims, medications can typically be transported in a cooler with an ice pack — call your pharmacy to confirm travel guidelines for your specific medications before you go.` +
      DISCLAIMER,
  },
  {
    phase: "Stimulation",
    title: "When to Call the Clinic During Stimulation",
    category: "Medical Info",
    type: "guide",
    readTime: "3 min read",
    summary:
      "Most side effects are normal, but some need immediate attention. Here's your red-flag checklist.",
    content:
      `Most side effects during stimulation are expected and manageable at home. But some symptoms need prompt medical attention. Knowing the difference helps you avoid both unnecessary panic and dangerous delays.

Call RFC immediately if you experience any of the following: severe or sharp abdominal pain that doesn't ease, sudden bloating that feels dramatically worse than before, rapid weight gain of more than 5 pounds in 24 hours, fever above 100.4°F, difficulty breathing or shortness of breath, or heavy vaginal bleeding. These can be signs of OHSS (Ovarian Hyperstimulation Syndrome) or another complication that needs evaluation right away.

Don't wait to see if symptoms improve on their own — err on the side of calling. RFC's team would much rather hear from you and reassure you than have you delay when something needs attention. Contact RFC here: https://www.rejuvenatingfertility.com/contact-us` +
      DISCLAIMER,
  },

  // ─── Retrieval & Fertilization ───────────────────────────────────────────
  {
    phase: "Retrieval & Fertilization",
    title: "Egg Retrieval Day: Your Complete Checklist",
    category: "Preparation",
    type: "guide",
    readTime: "4 min read",
    summary:
      "What to bring, what to wear, what to eat — everything you need to know for retrieval day.",
    content:
      `Retrieval day is a big milestone — you made it through stims! The procedure itself takes about 10-15 minutes and is done under light sedation (monitored anesthesia care), so you won't feel anything during the retrieval. Most patients feel groggy for an hour or so afterward and then gradually more like themselves through the rest of the day.

What to bring and do: arrive with valid photo ID, wear comfortable loose clothing (no perfume, lotion, or nail polish — these can affect the lab environment), follow your RFC team's specific fasting instructions (typically nothing to eat or drink after midnight), and have someone lined up to drive you home — you cannot drive after sedation. Plan to rest for the remainder of the day with a good show queued up.

Your RFC team will call you the next morning with your fertilization report — how many eggs were retrieved, how many were mature, and how many fertilized. This call is an emotional one; brace yourself either way and remember that the numbers will continue to change by day 5. Learn more at: https://www.rejuvenatingfertility.com/your-ivf-journey` +
      DISCLAIMER,
  },
  {
    phase: "Retrieval & Fertilization",
    title: "Recovery After Egg Retrieval: What's Normal",
    category: "Practical Tips",
    type: "article",
    readTime: "5 min read",
    summary:
      "Cramping, spotting, and fatigue are expected. Here's a day-by-day recovery guide from patients who've been there.",
    content:
      `The first day after retrieval is typically the most uncomfortable. Cramping similar to period pain, light spotting, bloating, and fatigue are all completely normal. Most patients benefit from a full day of rest, a heating pad on the abdomen, and taking it easy with low-demand activities. This is a great day to be kind to yourself — you just went through something physically significant.

Days 2-4 usually bring gradual improvement. Gentle walking is fine and can actually help with bloating. Salty foods and high-protein snacks support recovery (think eggs, cottage cheese, broth). Staying hydrated with electrolyte drinks helps your body process excess fluid. Avoid strenuous exercise, sexual activity, and submerging in water (baths, pools, hot tubs) until cleared by your RFC team.

By days 5-7, most patients feel close to normal. If you experience worsening pain, fever, inability to keep fluids down, or dramatically increasing bloating after day 2, call RFC — this could indicate OHSS, which is more common after high-response retrievals and is treatable when caught early.` +
      DISCLAIMER,
  },
  {
    phase: "Retrieval & Fertilization",
    title: "Understanding Embryo Grading",
    category: "Medical Info",
    type: "article",
    readTime: "6 min read",
    summary:
      "Your clinic will grade your embryos. Here's what those letters and numbers actually mean.",
    content:
      `After fertilization, your embryos are cultured in the lab for 5-6 days to reach the blastocyst stage. At that point, the embryologist grades each one based on two components: the inner cell mass (ICM), which will become the baby, and the trophectoderm (TE), which will become the placenta. Each component is graded A, B, or C, giving you a two-letter combination like AA, AB, BA, or BB. The number before the letters indicates expansion stage (3, 4, 5, or 6, with higher being more developed).

A top-grade embryo (4AA or 5AA) has the highest statistical chance of implantation, but lower-grade embryos successfully result in pregnancies every day. Grading is a probability tool, not a guarantee in either direction. An embryo graded BC has transferred and resulted in a healthy baby; an AA embryo sometimes doesn't implant. Please don't let a lower grade steal your hope before transfer.

Day 3 embryos (if transferred or biopsied earlier) are graded differently — on cell number and fragmentation percentage. Your RFC embryologist will walk you through your specific results and what they mean for your next steps.` +
      DISCLAIMER,
  },
  {
    phase: "Retrieval & Fertilization",
    title: "The Hunger Games: Waiting for Embryo Updates",
    category: "Emotional Support",
    type: "article",
    readTime: "5 min read",
    summary:
      "The days between retrieval and your embryo report can feel endless. Here's how to cope with the wait.",
    content:
      `The days between retrieval and your embryo update can feel agonizing. You may find yourself obsessing over the numbers, calculating attrition rates, or refreshing your phone waiting for the call. This is one of the most emotionally intense parts of the IVF process, and it makes complete sense — you've been through so much to get to this point.

What helps to remember: attrition between each stage is normal and expected in every clinic, at every age. Not all retrieved eggs will be mature. Not all mature eggs will fertilize. Not all fertilized eggs will make it to blastocyst. This is biology, not failure. The number that matters most is how many healthy blastocysts you have at the end — and sometimes one is enough.

Quality genuinely matters more than quantity. One chromosomally normal blastocyst has a strong chance of becoming a pregnancy. Give yourself permission to feel the emotions each update brings — the fear, the relief, the disappointment, the cautious hope. Your mentor is here for all of it, at any hour.` +
      DISCLAIMER,
  },
  {
    phase: "Retrieval & Fertilization",
    title: "PGT Genetic Testing: Should You Test Your Embryos?",
    category: "Medical Info",
    type: "article",
    readTime: "7 min read",
    summary:
      "Genetic testing can screen embryos before transfer. Here's what it involves and who it's recommended for.",
    content:
      `PGT (Preimplantation Genetic Testing) is an optional step that involves biopsying a few cells from each blastocyst and sending them to a genetics lab before transfer. PGT-A screens for chromosomal abnormalities like an extra or missing chromosome (aneuploidies), which are a leading cause of implantation failure and miscarriage. PGT-M tests for specific inherited single-gene conditions like BRCA or cystic fibrosis. PGT-SR is for structural chromosome rearrangements.

PGT-A is most commonly recommended for patients 35 and older (since chromosomal error rates increase with age), those who have experienced recurrent pregnancy loss, or those who have had multiple failed transfers. Testing can reduce miscarriage rates by identifying chromosomally normal embryos for transfer — but it also has a cost, requires a frozen embryo transfer cycle, and occasionally affects how many embryos remain viable for transfer.

PGT is not right for everyone, and the decision involves weighing your specific circumstances, values, and budget. Discuss this carefully with your RFC doctor at your consultation or retrieval debrief: https://www.rejuvenatingfertility.com/your-ivf-journey` +
      DISCLAIMER,
  },

  // ─── Transfer Prep ───────────────────────────────────────────────────────
  {
    phase: "Transfer Prep",
    title: "Preparing Your Lining for Embryo Transfer",
    category: "Medical Info",
    type: "article",
    readTime: "5 min read",
    summary:
      "A healthy uterine lining is key to implantation. Here's what your RFC team does to optimize it.",
    content:
      `A receptive uterine lining is one of the key ingredients for successful implantation. During a frozen embryo transfer cycle, your RFC team will prepare your lining with estrogen (usually oral or patches) to help it thicken. The goal is typically a lining of at least 7mm with a triple-stripe pattern visible on ultrasound — both thickness and texture matter.

Once your lining reaches the right thickness, progesterone is introduced to transition it into a receptive state. The timing of progesterone start is carefully calculated — transfer happens at a specific window based on how many days of progesterone exposure matches the stage your embryo was frozen at. This is why the ERA (Endometrial Receptivity Analysis) test can be valuable for patients with thin linings or previous unexplained failed transfers — it identifies your personal window of implantation.

RFC also offers uterine rejuvenation procedures for patients with persistently thin linings. Learn more here: https://www.rejuvenatingfertility.com/uterine-rejuvenation` +
      DISCLAIMER,
  },
  {
    phase: "Transfer Prep",
    title: "Fresh vs Frozen Transfer: What's the Difference?",
    category: "Medical Info",
    type: "article",
    readTime: "5 min read",
    summary:
      "Your RFC team will recommend fresh or frozen based on your situation. Here's how they compare.",
    content:
      `A fresh transfer occurs 3-5 days after egg retrieval, using embryos that were never frozen. A frozen embryo transfer (FET) uses embryos that were cryopreserved from a previous retrieval cycle, thawed, and transferred in a separate preparation cycle. Both approaches can achieve excellent outcomes — current research suggests success rates are comparable, and in some populations FET success rates are slightly higher.

Your RFC doctor may recommend a frozen transfer for several reasons: if you had a high response during stimulation (raising OHSS risk), if embryos are being biopsied for PGT (which requires time for genetic lab results), to allow your body time to fully recover from retrieval before implantation, or to better time the transfer window for optimal lining receptivity.

A fresh transfer may be recommended in specific cases where timing aligns perfectly and your body is ready. The biggest practical difference: a fresh transfer happens within the same cycle as retrieval, while FET involves a separate preparation cycle with monitoring appointments. Learn more at: https://www.rejuvenatingfertility.com/your-ivf-journey` +
      DISCLAIMER,
  },
  {
    phase: "Transfer Prep",
    title: "Acupuncture and Complementary Support",
    category: "Practical Tips",
    type: "article",
    readTime: "4 min read",
    summary:
      "Many patients add acupuncture around transfer time. Here's what the evidence says.",
    content:
      `Acupuncture is one of the most commonly requested complementary therapies among IVF patients, and RFC offers in-house acupuncture as part of their integrative approach to fertility care. Research suggests that acupuncture may support implantation by improving uterine blood flow, reducing cortisol levels, and supporting the nervous system during what is often a high-stress time.

The most commonly recommended timing is a session on the day of transfer — sometimes one shortly before and one shortly after the procedure itself. Some patients also incorporate acupuncture throughout their stimulation cycle for its general stress-reduction benefits. If you've never tried acupuncture before, the needles are hair-thin and most patients find the sessions deeply relaxing, often falling asleep on the table.

Ask your RFC care coordinator about scheduling an acupuncture session around your transfer date. Learn more about acupuncture at RFC: https://www.rejuvenatingfertility.com/acupuncture` +
      DISCLAIMER,
  },
  {
    phase: "Transfer Prep",
    title: "Transfer Day: What to Expect",
    category: "Preparation",
    type: "guide",
    readTime: "4 min read",
    summary:
      "Transfer is quick and painless — here's exactly what happens from arrival to going home.",
    content:
      `Embryo transfer is typically a quick, painless procedure — many patients describe it as similar to a pap smear. You'll be asked to arrive with a comfortably full bladder (this helps ultrasound guidance and is more comfortable for the procedure), and there's no sedation required. The actual transfer takes about 5-10 minutes from start to finish.

A thin, flexible catheter is guided gently through the cervix into the uterus under ultrasound visualization. The embryo is deposited in a precisely targeted location. Most patients feel mild pressure during the procedure and nothing more. Afterward, you'll rest briefly on the table — some clinics ask for 10-15 minutes — and then you're free to go home. No special restrictions on how you get there.

As for activity after transfer: research does not support strict bed rest, and your RFC team will give you specific guidance. Most patients take the rest of the day off and resume light, normal activity the next day. Learn more: https://www.rejuvenatingfertility.com/your-ivf-journey` +
      DISCLAIMER,
  },
  {
    phase: "Transfer Prep",
    title: "Mental Preparation: Visualization and Calming Techniques",
    category: "Emotional Support",
    type: "article",
    readTime: "5 min read",
    summary:
      "Your mind matters in this process. Simple techniques to feel centered heading into transfer.",
    content:
      `Your mental and emotional state heading into transfer matters — not because stress "causes" IVF failure (that's a harmful oversimplification), but because taking care of yourself is always worth doing. Many patients find that having a few calming rituals in place for transfer day makes the experience feel more peaceful and within their control, even when so much is not.

Techniques that resonate with many IVF patients: slow breathing (inhale for 4 counts, hold for 4, exhale for 6 — the extended exhale activates the parasympathetic nervous system), gentle visualization of the embryo settling safely into your lining, or simply listening to a playlist you associate with feeling calm and hopeful. Avoid anything that feels forced or performatively positive — genuine comfort is the goal, not toxic optimism.

Writing a short note to your embryo, picking a meaningful piece of jewelry to wear, or creating a small ritual that marks the day as significant — these are all ways patients have found meaning in the moment. Your transfer day is worth honoring, regardless of the outcome. You are doing something remarkable.` +
      DISCLAIMER,
  },

  // ─── Two Week Wait ───────────────────────────────────────────────────────
  {
    phase: "Two Week Wait",
    title: "Surviving the Two-Week Wait: Distraction Strategies That Actually Work",
    category: "Emotional Support",
    type: "article",
    readTime: "6 min read",
    summary:
      "The TWW is one of the hardest parts. Here are real strategies from patients who made it through.",
    content:
      `The two-week wait — the roughly 9-12 days between your transfer and your beta blood test — is widely considered the hardest part of the IVF process. You've done everything you can medically, and now the outcome is completely out of your hands. That loss of control is uniquely difficult for people who are already in a high-stakes, emotionally charged situation.

Distraction genuinely helps. Start a new TV series you can binge guilt-free. Cook new recipes. Take slow, gentle walks — movement is fine and often helps with anxiety. Journal without a specific goal, just letting your thoughts out on paper. Text your mentor when the anxiety spikes. Having small things to look forward to each day breaks the wait into manageable pieces rather than one long, shapeless stretch.

One thing many experienced patients recommend: stay away from IVF forums and symptom-tracking apps if they amplify your anxiety rather than soothe it. The rabbit holes of "what does cramping at 4dp5dt mean" are rarely useful and often terrifying. Your RFC team is the right source for medical questions, and your mentor is the right source for "I need someone who understands."` +
      DISCLAIMER,
  },
  {
    phase: "Two Week Wait",
    title: "Symptom Spotting: What's Real and What's the Progesterone",
    category: "Medical Info",
    type: "article",
    readTime: "5 min read",
    summary:
      "Cramping, sore breasts, fatigue — is it a pregnancy sign or just your medications?",
    content:
      `During the TWW, your body is receiving progesterone supplementation — whether in the form of vaginal suppositories, injections, or patches. Progesterone is the culprit behind most of the symptoms you'll notice during this period: breast tenderness, bloating, fatigue, light cramping, nausea, and heightened emotions. The deeply frustrating truth is that these symptoms are nearly identical whether a pregnancy is occurring or not.

This means that symptom-spotting is genuinely unreliable during the TWW. Patients with strongly positive betas have reported feeling "nothing" during the wait. Patients with negative results have reported feeling every early pregnancy symptom in the book. Both experiences are normal and neither predicts your outcome. The progesterone alone accounts for most of what you feel.

Experiencing symptoms is not a sign that things are going well. Not experiencing symptoms is not a sign that things are going poorly. The only reliable information comes from your beta blood test on the day your RFC team has scheduled it. Try to hold this truth gently when the symptom spiral begins, because it will begin.` +
      DISCLAIMER,
  },
  {
    phase: "Two Week Wait",
    title: "To Test or Not to Test Early",
    category: "Practical Tips",
    type: "article",
    readTime: "4 min read",
    summary:
      "Should you take a home pregnancy test before your beta? Pros and cons from both sides.",
    content:
      `Should you take a home pregnancy test before your official beta? There's no universally right answer — it depends entirely on what serves your emotional wellbeing. Some patients find that knowing early (even if the news is hard) helps them feel prepared and in control. Others find that a negative test before beta day derails them entirely, even when that test might not yet be accurate. Know yourself and be honest about which type you are.

If you decide to test early, wait until at least 9 days past a 5-day transfer (9dp5dt) for a reasonable chance of accuracy. Testing too early can produce a false negative even when implantation has occurred, because HCG levels may not yet be high enough to detect. Also be mindful of trigger shot timing — if you had an HCG trigger injection, residual HCG can show a false positive on a home test for up to 10-14 days afterward.

Whatever you decide, try not to judge yourself for it. Testing early or waiting both require courage of different kinds. Your RFC team's scheduled beta is the definitive answer, and it's coming regardless.` +
      DISCLAIMER,
  },
  {
    phase: "Two Week Wait",
    title: "Managing Anxiety During the Wait",
    category: "Emotional Support",
    type: "article",
    readTime: "5 min read",
    summary:
      "Anxiety during the TWW is completely normal. Here are gentle ways to care for yourself.",
    content:
      `Anxiety during the two-week wait isn't a sign that something is wrong with you — it's a completely reasonable response to an uncertain situation with enormous stakes. Trying to "just relax" is usually counterproductive advice that adds a layer of shame to an already hard experience. Working with the anxiety rather than fighting it tends to be more effective.

Grounding techniques can interrupt the anxiety spiral when it peaks: the 5-4-3-2-1 method (name 5 things you can see, 4 you can hear, 3 you can touch, 2 you can smell, 1 you can taste) pulls you back into the present moment very quickly. Gentle walks, especially in nature if you have access to it, can shift the nervous system out of fight-or-flight. Limiting time on social media — where pregnancy announcements and IVF posts can feel like landmines — is a protective strategy many patients find genuinely helpful.

If anxiety is significantly affecting your quality of life during fertility treatment, talking to a mental health professional who specializes in infertility can make a real difference. You deserve support through this process, not just at the end of it. Your RFC team can point you toward resources.` +
      DISCLAIMER,
  },
  {
    phase: "Two Week Wait",
    title: "Understanding Your Beta HCG Results",
    category: "Medical Info",
    type: "guide",
    readTime: "5 min read",
    summary:
      "Your beta blood test measures HCG levels. Here's what the numbers mean and what happens next.",
    content:
      `Your beta blood test — the HCG blood test that confirms whether implantation has occurred — is typically scheduled 9-12 days after a 5-day transfer at RFC. The test measures the level of human chorionic gonadotropin (HCG) in your blood. A positive result is generally anything above 5 mIU/mL, but the number itself matters less than whether it's rising appropriately over time.

Your RFC team will likely schedule a second beta 48 hours after the first. In a healthy early pregnancy, HCG should roughly double every 48 hours during the early weeks. A single number tells you less than the doubling pattern does. A slow rise warrants monitoring but is not automatically a bad outcome; a fast rise is reassuring but not a guarantee. Your RFC doctor will interpret your specific numbers in context of your full history.

If your first beta is positive, try not to fixate on comparing your number to others online — HCG ranges vary enormously at this stage. If the result is negative, your RFC team will walk you through next steps and discuss what, if anything, to consider differently for a future cycle. You don't have to face either result alone. Learn more at: https://www.rejuvenatingfertility.com/your-ivf-journey` +
      DISCLAIMER,
  },

  // ─── Early Pregnancy ─────────────────────────────────────────────────────
  {
    phase: "Early Pregnancy",
    title: "First Ultrasound: What to Expect at 6-7 Weeks",
    category: "Milestones",
    type: "guide",
    readTime: "4 min read",
    summary:
      "Your first ultrasound after a positive beta is a big moment. Here's what your team is looking for.",
    content:
      `Your first ultrasound after a positive beta is usually scheduled around 6-7 weeks (measured from your last menstrual period, or calculated from transfer date). This is a milestone moment — your RFC team will be looking for a gestational sac, a yolk sac within it, and ideally a fetal heartbeat. Seeing that flicker on the screen for the first time is something patients often describe as one of the most emotional moments of their entire journey.

If your ultrasound is at exactly 6 weeks and a heartbeat isn't visible yet, try not to panic — it may simply be too early. Small differences in embryo timing can shift things by a few days, and a follow-up ultrasound at 6.5 or 7 weeks often shows the heartbeat that wasn't yet detectable. If a sac is present and HCG is rising, those are encouraging signs worth holding onto.

Most RFC patients have follow-up ultrasounds around 8 and 10 weeks to confirm continued development before transitioning to OB care. Each confirmed milestone is a moment to breathe a little — and you've earned every one of them.` +
      DISCLAIMER,
  },
  {
    phase: "Early Pregnancy",
    title: "Graduating from Your RE to an OB",
    category: "Milestones",
    type: "article",
    readTime: "4 min read",
    summary:
      "Around 8-10 weeks, your RFC team will transition your care to an OB/GYN. Here's how that works.",
    content:
      `Around 8-10 weeks (sometimes earlier or later depending on your specific situation), your RFC team will transition your care to an OB/GYN — a moment often called "graduation." It can bring a mix of excitement and, for some patients, real anxiety about leaving the close support of a team that has been deeply involved in one of the most significant chapters of your life. Both feelings make complete sense.

Before your last appointment at RFC, make sure you have copies of all your relevant records: your IVF protocol, medication history, embryo report, beta HCG values, and early ultrasound results. Your OB will need this context, and not all OB practices are equally familiar with IVF pregnancies. Having documentation makes you a more effective advocate for yourself from the very first appointment.

If you don't already have an OB, RFC can often provide referrals or recommendations. Continue any medications your RFC doctor has prescribed — typically progesterone and estrogen supplements — until explicitly told to stop. Don't discontinue them on your own even after graduation; taper instructions should come from your RFC team.` +
      DISCLAIMER,
  },
  {
    phase: "Early Pregnancy",
    title: "Managing Anxiety After IVF Pregnancy",
    category: "Emotional Support",
    type: "article",
    readTime: "6 min read",
    summary:
      "A positive test doesn't always erase the fear. Post-IVF pregnancy anxiety is real and valid.",
    content:
      `A positive test doesn't always switch off the fear. For many patients who have been through the uncertainty of infertility and IVF, early pregnancy brings its own brand of anxiety — waiting for each ultrasound, scrutinizing every symptom, bracing for something to go wrong. This experience, sometimes called "pregnancy after infertility" anxiety, is incredibly common and completely understandable given everything you've been through.

Milestone-based thinking can help: rather than trying to feel fully safe, many patients give themselves permission to relax "just until the next appointment." The heartbeat at 6 weeks, the nuchal scan, the anatomy scan at 20 weeks — each milestone becomes a stepping stone. Staying connected to your mentor, who has likely navigated this same terrain, can help you feel less alone in the in-between stretches when appointments are far apart.

If anxiety is significantly affecting your daily life, please consider speaking with a therapist who specializes in perinatal mental health or the psychology of infertility. You deserve support during this chapter just as much as you did during treatment. RFC's team can point you toward resources when you're ready to ask.` +
      DISCLAIMER,
  },
  {
    phase: "Early Pregnancy",
    title: "When and How to Share Your News",
    category: "Emotional Support",
    type: "article",
    readTime: "4 min read",
    summary:
      "There's no right timeline to tell people. Here's how other IVF patients navigated sharing.",
    content:
      `There's no single right time to tell people you're pregnant after IVF, and there's no obligation to share the "how" along with the "what." Some patients find that sharing early with close family or friends — the people who've been supporting them throughout the journey — provides meaningful community during the anxious early weeks. Others prefer to wait until after the first trimester, when risks have decreased significantly.

IVF pregnancies can come with complicated feelings around disclosure. Some patients feel pressure to share details with people who knew about their treatment. Others feel protective of their privacy after having shared so much already. You are allowed to be vague, to say simply "we're expecting" without a backstory, and to share on your own timeline and your own terms. You don't owe anyone the details of how your baby was conceived.

If you share early and experience a difficult outcome, it can be painful to have to tell people — but it can also mean you receive more support when you need it most. There's no formula. Trust yourself to know what level of openness feels right for you and your family.` +
      DISCLAIMER,
  },

  // ─── Postpartum/Graduation ───────────────────────────────────────────────
  {
    phase: "Postpartum/Graduation",
    title: "Transitioning to OB Care: What to Bring Forward",
    category: "Preparation",
    type: "guide",
    readTime: "4 min read",
    summary:
      "Your OB needs to know your IVF history. Here's what to communicate during your first appointment.",
    content:
      `Your first OB appointment after IVF graduation is an important opportunity to make sure your new provider has the full picture. Come prepared with documentation of your IVF protocol (Natural, Mini, or Conventional and what medications were used), the number of retrieval cycles and transfers attempted, any medications you're currently on — especially progesterone, estrogen, or low-dose aspirin — and any complications or notable findings during the cycle.

Not all OBs have extensive experience with IVF patients, and some may not be familiar with RFC-specific protocols. This is not a criticism of your OB — it's simply a reality that means you may need to advocate for yourself. Don't hesitate to ask your OB if they're familiar with progesterone support tapering timelines, or to loop back with your RFC team if questions come up that your OB can't answer from an IVF-specific perspective.

You've worked hard to get here. Bringing your history forward isn't being difficult — it's being the best possible advocate for yourself and the pregnancy you fought so hard to achieve.` +
      DISCLAIMER,
  },
  {
    phase: "Postpartum/Graduation",
    title: "IVF-Specific Postpartum Emotions",
    category: "Emotional Support",
    type: "article",
    readTime: "5 min read",
    summary:
      "Postpartum after IVF can bring unique feelings — relief, guilt, grief for the hard road, all at once.",
    content:
      `Postpartum emotions after IVF can be uniquely complex. The relief of having made it through — of holding the baby you worked so hard for — can coexist with exhaustion, postpartum hormones, and grief for everything the journey cost you. Some patients describe feeling pressure to be grateful every single moment, which paradoxically makes it harder to acknowledge when they're struggling.

Survivor's guilt is something no one warns you about before graduation. If friends or community members are still in treatment while you're holding a newborn, the joy of your success can be shadowed by a complicated mix of gratitude and guilt. These feelings don't mean you're ungrateful — they mean you're still connected to a community and a struggle that has meant a great deal to you.

Postpartum depression and anxiety occur at comparable or higher rates in IVF patients compared to the general postpartum population. If you're struggling, please tell your OB, your partner, or someone you trust. You made it through extraordinary things to get here — you deserve support on the other side, not just during the hard parts.` +
      DISCLAIMER,
  },
  {
    phase: "Postpartum/Graduation",
    title: "Considering Becoming a Mentor",
    category: "Practical Tips",
    type: "article",
    readTime: "4 min read",
    summary:
      "Your experience could help someone else. Here's what being an RFC peer mentor looks like.",
    content:
      `If you've reached graduation, you carry something genuinely valuable: the lived experience of what this journey is really like — the fear before the first injection, the agonizing waits, the relief of each milestone, and the hard days in between. That knowledge and empathy can be a true lifeline for someone who is right where you were not long ago.

The mentor role in this app is a meaningful one. Mentors are matched with patients in their current phase or phases the mentor has been through, and the commitment is flexible — you offer support through messages when it works for your schedule. There's no requirement to have had a perfect or straightforward journey; in fact, having navigated setbacks, failed cycles, or difficult diagnoses often makes a mentor more relatable and genuinely reassuring to the patients they support.

If you're interested in becoming a mentor, reach out to your RFC care coordinator. The qualities that make someone a great mentor are ones you've likely already demonstrated throughout this journey: patience, honesty, and the willingness to show up for someone who is scared and needs to know it's possible.` +
      DISCLAIMER,
  },
  {
    phase: "Postpartum/Graduation",
    title: "Embryo Storage: Your Options Going Forward",
    category: "Medical Info",
    type: "article",
    readTime: "5 min read",
    summary:
      "If you have frozen embryos remaining, here are your options for storage, donation, or disposition.",
    content:
      `If you have frozen embryos remaining after completing your family building, you may feel uncertain about what to do with them. There's no timeline pressure — RFC charges annual storage fees, and many families take months or even years to make this decision. It's a deeply personal one, and you don't need to rush it.

Your options generally include: continuing to store embryos for future use (if you'd like to grow your family further or want to preserve the option), donating embryos to another family through an embryo adoption or donation program, donating to medical or scientific research, or compassionate transfer (a ceremonial, non-clinical transfer at a non-receptive time in the cycle for patients who want to honor the embryo in a meaningful way without pursuing pregnancy).

Whatever you decide, there is no wrong answer — only the answer that aligns with your values, your beliefs, and what feels right for your family. RFC's team can walk you through the logistics of each option when you're ready to have that conversation: https://www.rejuvenatingfertility.com/contact-us` +
      DISCLAIMER,
  },
];

async function createAdminAndResources() {
  const adminPass = await hashPassword("RFCadmin2026!");

  const [admin] = await db.insert(users).values({
    name: "Alifiya Batterywala",
    email: "alifiyab@rfcfertility.com",
    password: adminPass,
    role: "admin",
    status: "active",
  }).returning();

  for (const resource of seedResources) {
    await db.insert(resources).values({
      ...resource,
      createdBy: admin.id,
    });
  }

  console.log("Seed complete!");
  console.log(`Admin: alifiyab@rfcfertility.com / RFCadmin2026!`);
}

export async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db.select().from(users).where(eq(users.email, "alifiyab@rfcfertility.com"));
  if (existingAdmin.length > 0) {
    console.log("Database already seeded.");
    return;
  }

  await createAdminAndResources();
}

export async function resetAndReseed() {
  if (process.env.RESET_SEED !== "true") {
    return;
  }

  console.log("RESET_SEED=true detected — wiping existing data and reseeding...");

  console.log("  Deleting mentor_assignments...");
  await db.delete(mentorAssignments);
  console.log("  Deleting patient_phases...");
  await db.delete(patientPhases);
  console.log("  Deleting messages...");
  await db.delete(messages);
  console.log("  Deleting reports...");
  await db.delete(reports);
  console.log("  Deleting chat_attachments...");
  await db.delete(chatAttachments);
  console.log("  Deleting notifications...");
  await db.delete(notifications);
  console.log("  Deleting audit_log...");
  await db.delete(auditLog);
  console.log("  Deleting refresh_tokens...");
  await db.delete(refreshTokens);
  console.log("  Deleting resources...");
  await db.delete(resources);
  console.log("  Deleting users...");
  await db.delete(users);

  console.log("All demo data cleared. Running fresh seed...");
  await createAdminAndResources();
  console.log("Reset and reseed complete. Remove RESET_SEED from environment variables.");
}

export async function seedResourcesIfEmpty() {
  const existing = await db.select().from(resources);
  if (existing.length > 0) {
    console.log(`Resources already seeded (${existing.length} found), skipping.`);
    return;
  }

  const adminRows = await db.select().from(users).where(eq(users.email, "alifiyab@rfcfertility.com"));
  if (adminRows.length === 0) {
    console.log("Admin user not found, cannot seed resources.");
    return;
  }
  const adminId = adminRows[0].id;

  for (const resource of seedResources) {
    await db.insert(resources).values({
      ...resource,
      createdBy: adminId,
    });
  }

  console.log(`Seeded ${seedResources.length} resources.`);
}
