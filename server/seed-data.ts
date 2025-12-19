import { storage } from "./storage";

const seedLeads = [
  {
    id: "c0439bea-e8bf-446c-8386-7501918fb792",
    name: "Jonathan Einav",
    email: "jonathan.einav@gmail.com",
    tags: ["laid-off"],
    pipeline: "jumpseat",
    stage: "disqualified",
    summary: "Laid off. 3K applies total which lead to 40 interviews. No resume tailoring no cover letters, applying to director level.",
    keyTakeaways: ["Applied to 3k jobs", "No resume tailoring"],
    history: [{"date": "2025-12-09T10:00:00Z", "action": "Created from Fathom"}],
    archived: false,
    actionItems: []
  },
  {
    id: "cb3a46a6-334c-43bb-896d-871180599350",
    name: "Will",
    email: "william.ford0@gmail.com",
    tags: ["tentative"],
    pipeline: "jumpseat",
    stage: "disqualified",
    summary: "He wouldn't buy too tentative.",
    keyTakeaways: [],
    history: [{"date": "2025-12-14T10:00:00Z", "action": "Created from Fathom"}],
    archived: false,
    actionItems: []
  },
  {
    id: "2a45cbdd-d943-4b35-904f-de6caa981481",
    name: "Chris",
    email: "cflosco@gmail.com",
    tags: ["unemployed"],
    pipeline: "jumpseat",
    stage: "disqualified",
    summary: "Unemployed for a solar roofing company and is looking for remote work. Already bought a different service, doubt he would double up.",
    keyTakeaways: ["Looking for remote work", "Bought competitor service"],
    history: [{"date": "2025-12-11T10:00:00Z", "action": "Created from Fathom"}],
    archived: false,
    actionItems: []
  },
  {
    id: "ab0b4282-9a76-4c54-9150-2eed393ab5a6",
    name: "Chung",
    email: "thangcungh@gmail.com",
    tags: ["package-deal", "Q1"],
    pipeline: "jumpseat",
    stage: "future-client",
    nextFollowUp: "2026-02-01T17:00:00.000Z",
    summary: "Wants me to apply for him AND wife. But his wife is changing careers and he wants to double up.\n\nMarketing B2B sales, paid ads. He wants to Nudge Him in One week.\n\nHe would buy but im not ready for this level yet. Tell him Q2 I can save a seat",
    keyTakeaways: ["Double deal potential", "Marketing background"],
    history: [{"date": "2025-11-30T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T18:57:36.651Z", "action": "Moved to future-client"}],
    archived: false,
    actionItems: ["Send Email that I can take him on Q2 once system is more fluid"]
  },
  {
    id: "80ff3bf7-8123-4a3d-8d3a-74b29ced9efa",
    name: "Celeste",
    email: "cavalic17@gmail.com",
    tags: ["tentative", "Q1"],
    pipeline: "jumpseat",
    stage: "future-client",
    nextFollowUp: "2026-02-01T17:00:00.000Z",
    summary: "She is tentative. After our first call she sent me a giant list of concerns. She would be a fit for Q2 people once I get the system going.\n\nAlso she is shifting into BSA work.\n\nWay too conservative with applying strategy. She is interested but I wouldn't work with her.From Canada working currently in Digital Transformations.",
    keyTakeaways: ["Conservative strategy", "Interested but hesitant"],
    pitchAmount: "$4,000",
    history: [{"date": "2025-12-13T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T01:39:09.022Z", "action": "Moved to future-client"}],
    archived: false,
    actionItems: ["Send email that I cant take her this cohort"]
  },
  {
    id: "384cd2c1-cb2f-41ac-b1ec-b1849b5797a9",
    name: "Mike Duffy",
    email: "duffcutco@hotmail.com",
    tags: ["Q2"],
    pipeline: "jumpseat",
    stage: "future-client",
    nextFollowUp: "2026-06-01T16:00:00.000Z",
    summary: "Mike is currently facing financial constraints, which prevent him from affording the service fee of $6,000 at this time. He is interested in the service but plans to re-engage around June 2026, depending on the success of his debt-reduction strategy.",
    keyTakeaways: ["Email Mike re: June 2026 check-in; include website application link"],
    recordingLink: "https://fathom.video/calls/509808455",
    fathomRecordingId: 109407568,
    history: [{"date": "2025-12-17T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T01:49:38.994Z", "action": "Enhanced with Fathom call: Mike Duffee"}, {"date": "2025-12-18T19:17:08.499Z", "action": "Moved to future-client"}],
    archived: false,
    actionItems: []
  },
  {
    id: "719ea5d6-4c64-46b6-bba1-b903a831800c",
    name: "Del",
    email: "delano_j@outlook.com",
    linkedIn: "https://www.linkedin.com/in/del-johnson/",
    tags: ["tech", "high-value"],
    pipeline: "jumpseat",
    stage: "closed",
    onboardingStage: "call-1",
    summary: "Salesforce Architect. Claude Code, LinkedIn.ai\n\nExtremely talented developer $150K+ Salary",
    keyTakeaways: ["High intent", "Salesforce Architect"],
    pitchAmount: "$6,000 upfront",
    history: [{"date": "2025-12-22T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T01:26:39.783Z", "action": "Moved to nudge-scheduled"}, {"date": "2025-12-18T01:28:32.300Z", "action": "Moved to future-client"}, {"date": "2025-12-18T01:28:35.255Z", "action": "Moved to closed"}, {"date": "2025-12-18T01:28:39.549Z", "action": "Moved to future-client"}, {"date": "2025-12-18T01:39:17.057Z", "action": "Moved to nudge-scheduled"}, {"date": "2025-12-18T21:07:08.530Z", "action": "Moved to closed"}],
    archived: false,
    actionItems: []
  },
  {
    id: "059db65e-e3fb-4c31-8930-d51aaa85840d",
    name: "Naj",
    email: "najeeduddin@gmail.com",
    tags: ["tech", "Q1"],
    pipeline: "jumpseat",
    stage: "future-client",
    nextFollowUp: "2026-02-01T17:00:00.000Z",
    summary: "Software for recruiting companies. He is a database administrator Has been applying with no success. He doesn't use cover letters.\n\nHe would be a perfect candidate for our Q2 cohort but cant put the money forward yet.",
    keyTakeaways: ["DB Admin", "No success applying"],
    history: [{"date": "2025-12-15T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T00:47:49.167Z", "action": "Moved to pitch-call"}, {"date": "2025-12-18T01:39:22.772Z", "action": "Moved to future-client"}],
    archived: false,
    actionItems: []
  },
  {
    id: "4d80861c-baf6-41c5-bae4-2ea991d5db89",
    name: "Matan",
    email: "matancoalition@gmail.com",
    tags: ["ready", "Hasn't responded"],
    pipeline: "jumpseat",
    stage: "nudge-scheduled",
    nextFollowUp: "2025-12-21T00:00:00.000Z",
    summary: "Very cautious, concerned about getting caught. Works as an actuary.\nLives in NJ.\n\nHe is ready to go and would work.\n\nQuoted $6,000.\n\nI sent an email on Dec 17th. No response yet.",
    keyTakeaways: [],
    history: [{"date": "2025-12-23T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T00:43:38.285Z", "action": "Moved to nudge-scheduled"}, {"date": "2025-12-18T00:48:35.223Z", "action": "Moved to decision-pending"}, {"date": "2025-12-18T17:48:47.268Z", "action": "Moved to nudge-scheduled"}],
    archived: false,
    actionItems: ["Follow-up again"]
  },
  {
    id: "ef4b51ba-ec24-488f-857a-0966934d8c56",
    name: "Alonzo",
    email: "alonzo.hatten123@gmail.com",
    tags: ["military", "engineering", "Q1"],
    pipeline: "jumpseat",
    stage: "future-client",
    summary: "Active duty military. Graduating soon. Engineering. He's good for Q1.",
    keyTakeaways: ["Military transition", "Q1 prospect"],
    history: [{"date": "2025-12-09T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T19:43:54.078Z", "action": "Moved to future-client"}],
    archived: false,
    actionItems: []
  },
  {
    id: "2566b1cb-9f7d-4ac3-bb0b-f51fc3ed461f",
    name: "Tom",
    email: "tom@redeogen.com",
    tags: ["international"],
    pipeline: "jumpseat",
    stage: "disqualified",
    summary: "In australia but already overemployed, Not sure Im ready for him yet but maybe in the future. I dont think he would sign as it seems he had a process already",
    keyTakeaways: [],
    pitchAmount: "$4,000",
    history: [{"date": "2025-11-30T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T19:44:38.338Z", "action": "Moved to disqualified"}],
    archived: false,
    actionItems: []
  },
  {
    id: "0915e652-c633-4f37-9314-65cc92db7763",
    name: "Brenden",
    email: "brendenw@gmail.com",
    tags: ["career-pivot"],
    pipeline: "community",
    stage: "backlog",
    summary: "Sales engineering but wants to be project manager. Don't think he is a fit.",
    keyTakeaways: ["Wants to pivot to PM", "Active Army"],
    history: [{"date": "2025-12-04T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T19:45:22.129Z", "action": "Moved to backlog"}],
    archived: false,
    actionItems: []
  },
  {
    id: "828e17ac-d62f-4d2e-bc9d-d5d66c08245e",
    name: "Alex Merelus",
    email: "xmerelus@protonmail.com",
    tags: ["Columbia"],
    pipeline: "jumpseat",
    stage: "nudge-scheduled",
    nextFollowUp: "2025-12-21T01:52:38.385Z",
    summary: "Alex is currently seeking a second remote Identity Access Management (IAM) cybersecurity role to increase his income, motivated by the high availability of remote work in the field. He is facing the challenge of navigating a job search and may have concerns due to his non-US location being an untested variable. Alex plans to make a decision by Friday regarding the assistance offered for his job search.",
    keyTakeaways: ["Hold Alex's onboarding slot until Dec 20"],
    recordingLink: "https://fathom.video/calls/509816579",
    fathomRecordingId: 109597102,
    history: [{"date": "2025-12-18T01:27:43.941Z", "action": "Imported from Fathom: Alex M"}, {"date": "2025-12-18T01:28:02.067Z", "action": "Moved to decision-pending"}, {"date": "2025-12-18T01:28:05.001Z", "action": "Moved to nudge-scheduled"}, {"date": "2025-12-18T01:52:39.892Z", "action": "Enhanced with Fathom call: Alex M"}],
    archived: false,
    actionItems: ["Send him an email On Friday, said he would have a decision by then"]
  },
  {
    id: "bb6f5bf7-b842-4383-887a-0428ed8ef26f",
    name: "Ben",
    email: "benbutton@gmail.com",
    tags: ["Q2"],
    pipeline: "jumpseat",
    stage: "future-client",
    summary: "Kubernetes kid just moved to Florida for a remote job. Soon looking for a second but he needs to optimize his first.\n\nMaybe Q2",
    keyTakeaways: [],
    history: [{"date": "2025-11-30T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T19:40:40.508Z", "action": "Moved to future-client"}],
    archived: false,
    actionItems: []
  },
  {
    id: "31a6a6c9-6e89-4d53-a43a-3456ce0af9ee",
    name: "Valentino",
    email: "val_vdrr@protonmail.com",
    tags: [],
    pipeline: "jumpseat",
    stage: "backlog",
    summary: "Upcoming call: Valentino and Wilson Wye",
    keyTakeaways: [],
    calendarEventId: "dr3hr0j6ppn1trche92a9ov8ko",
    history: [{"date": "2025-12-18T01:40:52.791Z", "action": "Auto-created from calendar: Valentino and Wilson Wye"}],
    archived: false,
    actionItems: []
  },
  {
    id: "c84188d2-0816-4b07-a982-4c8599628281",
    name: "Michael McClellan",
    email: "tredennick9@gmail.com",
    tags: [],
    pipeline: "jumpseat",
    stage: "backlog",
    summary: "Upcoming call: Michael McClellan and Wilson Wye\n\nI dont think he is the project manager working at amazon.",
    keyTakeaways: [],
    calendarEventId: "5g1qh8793u56e6mgtbiv4ptf98",
    history: [{"date": "2025-12-18T01:40:52.783Z", "action": "Auto-created from calendar: Michael McClellan and Wilson Wye"}],
    archived: false,
    actionItems: []
  },
  {
    id: "b1c51b9b-ad4d-4487-b834-0f8c2ff4b240",
    name: "Carl J Noonan",
    email: "carl.j.noonan@gmail.com",
    linkedIn: "https://www.linkedin.com/in/carlnoonan/",
    tags: [],
    pipeline: "jumpseat",
    stage: "decision-pending",
    nextFollowUp: "2025-12-21T21:03:52.929Z",
    summary: "Upcoming call: Carl Noonan and Wilson Wye\n\nLinkediN needs a lot of work\n\n\"Bring Humanity to Technology\"\n\n--- Fathom Call (Dec 18, 2025) ---\nThe client aims to secure a remote IT supervisor role to move beyond their current Help Desk position, as they face challenges with night driving that necessitate remote work. They are considering a $4,000 investment, which would require taking out a loan, and they have a 3-day hold on a slot in the first cohort. The client is weighing the decision due to financial constraints and the competitive job market.",
    keyTakeaways: ["Email Owner onboarding doc + service details; request review/decision by Dec 21"],
    pitchAmount: "$2,000 upfront, $2,000 after onboarding then $2,000 from paycheck",
    recordingLink: "https://fathom.video/calls/512135815",
    calendarEventId: "2m7mdt4ks2962g553krnj664uk",
    fathomRecordingId: 109902227,
    history: [{"date": "2025-12-18T01:40:52.747Z", "action": "Auto-created from calendar: Carl Noonan and Wilson Wye"}, {"date": "2025-12-18T21:03:54.492Z", "action": "Enhanced with Fathom call: Carl Noonan"}, {"date": "2025-12-18T21:11:04.688Z", "action": "Moved to decision-pending"}, {"date": "2025-12-18T22:28:19.575Z", "action": "Completed: Send off service description"}],
    archived: false,
    actionItems: []
  },
  {
    id: "0afc6a0f-78ca-4dc8-bd9b-32ae29a07012",
    name: "Dimas O Gonzales",
    email: "dimas.o.gonzales@gmail.com",
    tags: ["diamond in the rough"],
    pipeline: "jumpseat",
    stage: "closed",
    onboardingStage: "call-2",
    nextFollowUp: "2025-12-21T01:58:53.574Z",
    summary: "Dimas is a computer engineering graduate with a background in chemistry and a self-taught aptitude for technology. He has experience as a part-time developer at Capture Technologies, which helped him practically apply his academic knowledge. Dimas is motivated by a desire to work with intelligent individuals and seeks opportunities that will challenge him and foster growth in his skills.",
    keyTakeaways: ["Email Dimas re: send current resume + cover letters", "Update intake site: replace JS code blocks w/ visual formatting"],
    recordingLink: "https://fathom.video/calls/509808461",
    fathomRecordingId: 109259139,
    history: [{"date": "2025-12-18T01:28:53.352Z", "action": "Imported from Fathom: Dimas"}, {"date": "2025-12-18T01:29:00.502Z", "action": "Moved to closed"}, {"date": "2025-12-18T01:29:08.532Z", "action": "Onboarding: Call #2"}, {"date": "2025-12-18T01:58:54.959Z", "action": "Enhanced with Fathom call: Dimas"}],
    archived: false,
    actionItems: []
  },
  {
    id: "962488f3-3d4c-4708-9c15-ba540ed1906e",
    name: "Lisa",
    company: "Gmail",
    email: "lisavuskovic@gmail.com",
    tags: [],
    pipeline: "community",
    stage: "would-buy",
    nextFollowUp: "2025-12-21T01:52:34.283Z",
    summary: "Lisa, after experiencing a layoff from Meta, is seeking a stable job that offers benefits while she develops two side businesses: a nonprofit and a UX research consultancy for startups. Her primary need is to find her first stable job, as she feels Wilson's current service, which targets employed individuals seeking additional roles, does not align with her situation. Lisa is interested in exploring future collaboration opportunities with Wilson.",
    keyTakeaways: ["Update LinkedIn: add nonprofit volunteer roles; keep minimal; no startup UX", "Email Lisa latest newsletter"],
    recordingLink: "https://fathom.video/calls/509808459",
    fathomRecordingId: 109268569,
    history: [{"date": "2025-12-18T01:52:37.012Z", "action": "Imported from Fathom: Lisa"}, {"date": "2025-12-18T01:59:12.027Z", "action": "Moved to backlog"}, {"date": "2025-12-18T18:49:57.709Z", "action": "Moved to would-buy"}],
    archived: false,
    actionItems: []
  },
  {
    id: "3c2cb983-21c1-49b9-8b48-6c763b11cb4e",
    name: "Mike Ellsworth",
    company: "Gmail",
    email: "ellsworth.michaelg@gmail.com",
    linkedIn: "https://www.linkedin.com/in/michael-ellsworth-19b062125/",
    tags: ["Perfect Candidate"],
    pipeline: "jumpseat",
    stage: "decision-pending",
    nextFollowUp: "2025-12-21T01:52:35.491Z",
    summary: "Mike Ellsworth is a Nationwide PM who currently has 1-2 hours per day for dedicated job search efforts. He aims to secure a second role but finds his current networking strategy unscalable. Mike is looking for a solution that streamlines the application and scheduling process, allowing him to focus solely on interviews.\n\nHe needs to Chat with the Wife.",
    keyTakeaways: ["Update deck re: weekly captain's log + audit sheet", "Email Mike contract/terms (pricing, guarantee, onboarding, weekly log, audit sheet); request review + decision"],
    pitchAmount: "$6,000",
    recordingLink: "https://fathom.video/calls/509808457",
    fathomRecordingId: 109527613,
    history: [{"date": "2025-12-18T01:52:36.711Z", "action": "Imported from Fathom: Mike Ellsworth"}, {"date": "2025-12-18T18:40:43.829Z", "action": "Moved to decision-pending"}, {"date": "2025-12-18T22:53:15.435Z", "action": "Completed: Send Contract"}],
    archived: false,
    actionItems: []
  },
  {
    id: "d42db318-e490-4a26-bac2-7ab25af7877f",
    name: "Wwhunsinger",
    email: "wwhunsinger@gmail.com",
    tags: [],
    pipeline: "jumpseat",
    stage: "backlog",
    summary: "Upcoming call: Wilson | Kat YT Catchup",
    keyTakeaways: [],
    calendarEventId: "u1eketai2e7b8n34fmnrv340ts_20251219T170000Z",
    history: [{"date": "2025-12-18T18:07:16.543Z", "action": "Auto-created from calendar: Wilson | Kat YT Catchup"}],
    archived: true,
    actionItems: []
  },
  {
    id: "d57b1865-0afc-4bdd-be2d-0519cff44016",
    name: "Weekly",
    email: "mtroymagtang01@gmail.com",
    tags: [],
    pipeline: "jumpseat",
    stage: "backlog",
    summary: "Upcoming call: Weekly with Wilson",
    keyTakeaways: [],
    calendarEventId: "qg4cojbnqtbrjfdm6s6rmdmcdt_20251225T030000Z",
    history: [{"date": "2025-12-18T18:07:16.560Z", "action": "Auto-created from calendar: Weekly with Wilson"}],
    archived: true,
    actionItems: []
  },
  {
    id: "4adda612-61f4-431e-861d-93d49a20c4ad",
    name: "Albin",
    email: "albincikaj@gmail.com",
    tags: [],
    pipeline: "community",
    stage: "would-buy",
    summary: "Ops engineer/data engineer.\n\nMoved to vienna from Kosovo. But the project he was supposed to get onboarded into got delayed.\n\nHe wouldnt join Jumpseat but absolutley would do community",
    keyTakeaways: [],
    history: [{"date": "2025-12-18T19:10:40.469Z", "action": "Created"}, {"date": "2025-12-18T19:11:33.359Z", "action": "Moved to would-buy"}],
    archived: false,
    actionItems: []
  },
  {
    id: "fe475cf8-788a-4974-a264-99f7e2f3fa70",
    name: "Andrii",
    email: "andrii.nogim.product@gmail.com",
    tags: [],
    pipeline: "community",
    stage: "to-pitch",
    summary: "Grew up in Ukraine but had to flee Germany and now is based out of Bankok\n\nWorks as a project manager in DeFI but wants to break into US market. REALLY tough sell, he has no degree, no visa and didnt finish highschool.\n\nI advised him to use his Ukrainian background to find someone in US from DeFI space.\n\nThink he would join community.",
    keyTakeaways: [],
    history: [{"date": "2025-12-18T19:14:05.539Z", "action": "Created"}, {"date": "2025-12-18T19:15:46.374Z", "action": "Moved to to-pitch"}],
    archived: false,
    actionItems: []
  },
  {
    id: "9b11fdc3-7ef0-47fa-a4c1-54e5ba58dd6a",
    name: "Ty Bohannon",
    email: "tybohannon@gmail.com",
    tags: ["perfect-fit", "RTO", "Hasn't answered"],
    pipeline: "jumpseat",
    stage: "backlog",
    summary: "10 years at spectrum but they are Calling RTO currently. Wants 50/50 blend.\n\nI sent him an email on Dec 12th and he has not answered",
    keyTakeaways: ["10 years exp", "Hates RTO"],
    history: [{"date": "2025-12-16T10:00:00Z", "action": "Created from Fathom"}, {"date": "2025-12-18T00:45:53.604Z", "action": "Moved to pitch-call"}, {"date": "2025-12-18T19:39:34.811Z", "action": "Moved to backlog"}],
    archived: false,
    actionItems: []
  },
  {
    id: "346da7ac-7c6f-4988-84f1-3bf33a41de7b",
    name: "Carl-Fredrik Alveklint",
    email: "akveklint@protonmail.com",
    tags: ["Swedish"],
    pipeline: "community",
    stage: "would-buy",
    summary: "Had a rough year, miscarriage and a big move which drained savings.\n\nSwedish guy working in southern spain as an Account Executive.\nWants to do contract work. but in europe people keep trying to hire him full time.\n\nGave me the brilliant idea to do phone follow-ups 1-2 days after apply.",
    keyTakeaways: [],
    pitchAmount: "$4000",
    history: [{"date": "2025-12-18T18:53:53.118Z", "action": "Created"}, {"date": "2025-12-18T18:56:00.885Z", "action": "Moved to would-buy"}],
    archived: false,
    actionItems: []
  },
  {
    id: "e7edba7f-026d-427b-bd39-0cdf0ccb0a7b",
    name: "Marta",
    email: "kaminskalilly@gmail.com",
    tags: [],
    pipeline: "community",
    stage: "would-buy",
    nextFollowUp: "2026-04-01T16:00:00.000Z",
    summary: "Polish but works for a dutch company as a Project Manager(IT) but is willing to also do recrtuitment coordinator role.\n\nShe is living in Thailand and as of now the offer is too much money for her.\n\nI think she would join community",
    keyTakeaways: [],
    history: [{"date": "2025-12-18T19:09:01.925Z", "action": "Created"}, {"date": "2025-12-18T19:10:09.375Z", "action": "Moved to would-buy"}],
    archived: false,
    actionItems: []
  },
  {
    id: "faa1c3fa-8462-4a5a-a879-f953efb09a48",
    name: "Sandra",
    email: "smarinfernan@gmail.com",
    tags: ["Belgium"],
    pipeline: "community",
    stage: "to-pitch",
    summary: "In person Wants to be remote but doesnt want to be a contractor.",
    keyTakeaways: [],
    history: [{"date": "2025-12-18T19:07:18.342Z", "action": "Created"}, {"date": "2025-12-18T19:08:20.741Z", "action": "Moved to to-pitch"}],
    archived: false,
    actionItems: []
  },
  {
    id: "a2f9d281-7b07-470c-986a-580285deb1af",
    name: "Kalunga",
    email: "kalungashawa@gmail.com",
    tags: ["Zambia"],
    pipeline: "community",
    stage: "to-pitch",
    summary: "From Zambia. Currently working through upwork but wants to stack contracting positions.\n\nHe said price was too high. He might do community",
    keyTakeaways: [],
    pitchAmount: "$4000 then $2K from first paycheck",
    history: [{"date": "2025-12-18T19:12:12.625Z", "action": "Created"}, {"date": "2025-12-18T19:13:30.949Z", "action": "Moved to to-pitch"}],
    archived: false,
    actionItems: []
  },
  {
    id: "bad1527c-5d1a-49f9-9c4a-8e4ced9c0192",
    name: "Andrew Yoon",
    company: "Gmail",
    email: "ayoonux@gmail.com",
    tags: ["My Favorite"],
    pipeline: "jumpseat",
    stage: "decision-pending",
    nextFollowUp: "2025-12-21T01:52:36.313Z",
    summary: "Andrew is a 20-year UX designer with developer skills, seeking a second role. He is interested in exploring opportunities that utilize his expertise but may face challenges in managing the application process efficiently. His goal is to secure a suitable position without added stress from logistics and scheduling.",
    keyTakeaways: ["Email Andrew written program overview re: onboarding, apply, interview, pricing"],
    pitchAmount: "$4,000 then $2K from first paycheck",
    recordingLink: "https://fathom.video/calls/509808458",
    fathomRecordingId: 109541518,
    history: [{"date": "2025-12-18T01:52:40.125Z", "action": "Imported from Fathom: Andrew"}, {"date": "2025-12-18T18:56:58.643Z", "action": "Moved to decision-pending"}, {"date": "2025-12-18T22:55:43.382Z", "action": "Completed: Send contract"}],
    archived: false,
    actionItems: []
  },
  {
    id: "4f30a5cc-b596-47e6-9de0-fb206d63726c",
    name: "Randy Scmitz",
    email: "randy@theschmitz.com",
    tags: [],
    pipeline: "jumpseat",
    stage: "nudge-scheduled",
    summary: "Incredible sales person.\n\nExecutive recruiter who is looking for a second job. Needs something discrete as his current job is high exposure.\n\nBy the end of the call I told him that I would love to have him on my team. But sadly I need to build the system that can actually get people jobs first. So I will circle back with him.",
    keyTakeaways: [],
    history: [{"date": "2025-12-18T19:19:00.179Z", "action": "Created"}, {"date": "2025-12-18T19:20:39.725Z", "action": "Moved to nudge-scheduled"}],
    archived: false,
    actionItems: []
  }
];

const seedBlockers = [
  {
    id: "b468c135-d71a-4526-9ffb-42aca5c06fac",
    text: "It's too expensive for us right now",
    category: "price",
    count: 12,
    response: "- Compare cost of inaction\n- Offer payment plan\n- Highlight ROI timeframe",
    exampleLeadIds: []
  },
  {
    id: "27d571df-1d63-457c-bc7d-8d8f76671589",
    text: "Need to check with my spouse/partner",
    category: "spouse",
    count: 8,
    response: "- Send 'partner packet' PDF\n- Offer joint call",
    exampleLeadIds: []
  }
];

export async function seedProductionDatabase() {
  try {
    const existingLeads = await storage.getAllLeads();
    const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase()));
    
    console.log(`Found ${existingLeads.length} existing leads. Checking for missing leads to seed...`);
    
    let seededCount = 0;
    for (const lead of seedLeads) {
      if (!lead.email || !existingEmails.has(lead.email.toLowerCase())) {
        try {
          await storage.createLead(lead as any);
          console.log(`Seeded lead: ${lead.name}`);
          seededCount++;
        } catch (err) {
          console.log(`Lead ${lead.name} may already exist or failed, skipping...`);
        }
      }
    }
    
    const existingBlockers = await storage.getAllBlockers();
    if (existingBlockers.length === 0) {
      for (const blocker of seedBlockers) {
        try {
          await storage.createBlocker(blocker as any);
          console.log(`Seeded blocker: ${blocker.text}`);
        } catch (err) {
          console.log(`Blocker may already exist, skipping...`);
        }
      }
    }
    
    console.log(`Database seeding complete! Added ${seededCount} new leads.`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
