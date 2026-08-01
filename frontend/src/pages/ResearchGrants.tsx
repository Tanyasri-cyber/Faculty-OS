import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Calendar, Plus, Clock, Search, BookOpen,
  ExternalLink, Send, ArrowRight, RefreshCw, Download,
  CheckCircle2, AlertTriangle, Zap, Link2, FileText,
  Users, Hash, Quote, Globe, ChevronDown, ChevronRight,
  Sparkles, X, Check, Database, Eye, Lightbulb, Target,
  FlaskConical, TrendingUp, IndianRupee, LayoutList, Wand2,
  ClipboardCheck, ChevronUp, Copy, PenLine
} from 'lucide-react';
import { Card, Button, Input, Badge, Seal } from '../components/Common';
import { api, type ChatMessage, type User as UserType } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Grant Funding Bodies ─────────────────────────────────────────────────────
const GRANT_CONFIGS = [
  {
    id: 'aicte',
    name: 'AICTE',
    fullName: 'All India Council for Technical Education',
    color: '#0EA5E9',
    focus: 'Technical education research, innovation in engineering & technology',
    maxAmount: '₹30 Lakhs',
    duration: '2–3 Years',
    schemes: ['RPS – Research Promotion Scheme', 'MODROB', 'AQIS', 'Faculty Development Program'],
  },
  {
    id: 'anrf',
    name: 'ANRF',
    fullName: 'Anusandhan National Research Foundation',
    color: '#8B5CF6',
    focus: 'Frontier research across science, technology, and humanities',
    maxAmount: '₹1 Crore+',
    duration: '3–5 Years',
    schemes: ['Core Research Grant', 'International Bilateral Research', 'PM-USHA'],
  },
  {
    id: 'dst',
    name: 'DST',
    fullName: 'Department of Science & Technology',
    color: '#10B981',
    focus: 'Basic & applied science, S&T policy, infrastructure',
    maxAmount: '₹50 Lakhs',
    duration: '2–4 Years',
    schemes: ['SERB Core Research Grant', 'FIST', 'INSPIRE', 'IMPRINT India'],
  },
  {
    id: 'serb',
    name: 'SERB',
    fullName: 'Science & Engineering Research Board',
    color: '#F59E0B',
    focus: 'Peer-reviewed scientific & engineering research',
    maxAmount: '₹75 Lakhs',
    duration: '3 Years',
    schemes: ['CRG – Core Research Grant', 'SRG', 'MATRICS', 'TARE', 'CPS', 'IPA'],
  },
  {
    id: 'dbt',
    name: 'DBT',
    fullName: 'Department of Biotechnology',
    color: '#EC4899',
    focus: 'Biotechnology, bioinformatics, life sciences',
    maxAmount: '₹60 Lakhs',
    duration: '3 Years',
    schemes: ['DBT-BUILDER', 'Twinning Program', 'Ramalingaswami Re-entry Fellowship'],
  },
  {
    id: 'icmr',
    name: 'ICMR',
    fullName: 'Indian Council of Medical Research',
    color: '#EF4444',
    focus: 'Biomedical & health research',
    maxAmount: '₹40 Lakhs',
    duration: '2–3 Years',
    schemes: ['Extramural Research', 'Task Force Projects', 'Capacity Building'],
  },
  {
    id: 'mnre',
    name: 'MNRE',
    fullName: 'Ministry of New & Renewable Energy',
    color: '#84CC16',
    focus: 'Solar, wind, bioenergy, hydrogen energy research',
    maxAmount: '₹1.5 Crore',
    duration: '3–5 Years',
    schemes: ['National Solar Mission', 'Green Hydrogen Mission', 'R&D in Renewable Energy'],
  },
  {
    id: 'csir',
    name: 'CSIR',
    fullName: 'Council of Scientific & Industrial Research',
    color: '#06B6D4',
    focus: 'Industrial R&D, advanced manufacturing, materials science',
    maxAmount: '₹50 Lakhs',
    duration: '3 Years',
    schemes: ['CSIR-SUPRA', 'CSIR Young Scientist Award', 'EMR Scheme'],
  },
];

// ── Proposal section definitions ─────────────────────────────────────────────
const PROPOSAL_SECTIONS = [
  { key: 'abstract',          label: 'Abstract',              icon: FileText,      color: 'text-sky-400' },
  { key: 'problem',           label: 'Problem Statement',     icon: AlertTriangle,  color: 'text-orange-400' },
  { key: 'objectives',        label: 'Objectives',            icon: Target,         color: 'text-green-400' },
  { key: 'methodology',       label: 'Methodology',           icon: FlaskConical,   color: 'text-purple-400' },
  { key: 'outcomes',          label: 'Expected Outcomes',     icon: TrendingUp,     color: 'text-emerald-400' },
  { key: 'budget',            label: 'Budget Justification',  icon: IndianRupee,    color: 'text-amber-400' },
  { key: 'timeline',          label: 'Timeline',              icon: Calendar,       color: 'text-pink-400' },
];

// ── Proposal content generator ───────────────────────────────────────────────
function generateProposalContent(
  grant: typeof GRANT_CONFIGS[0],
  title: string,
  objectives: string,
  keywords: string[]
): Record<string, string> {
  const kw = keywords.join(', ');
  const objLines = objectives.split('\n').filter(Boolean).map((o, i) => `${i + 1}. ${o.trim()}`).join('\n');

  return {
    abstract:
`This research proposal presents a comprehensive investigation into "${title}", submitted under the ${grant.name} (${grant.fullName}) ${grant.schemes[0]} scheme. The study addresses critical gaps in the domain of ${kw}, which remains underexplored in the Indian academic context. Leveraging state-of-the-art methodologies and interdisciplinary approaches, this project aims to deliver significant scientific advancements and practical solutions aligned with the National Education Policy 2020 and India's vision of becoming an Atmanirbhar technological nation. The proposed research will be executed over ${grant.duration} with a requested funding of up to ${grant.maxAmount}. Expected outcomes include high-impact publications in SCIE-indexed journals, patent filings, and deployable prototypes.

Keywords: ${kw}`,

    problem:
`The rapid evolution of ${keywords[0] || 'the target domain'} has unveiled significant challenges that current systems and methodologies fail to address adequately. Existing approaches suffer from:

• Scalability limitations: Present solutions do not generalise well beyond controlled laboratory environments.
• Data scarcity and quality: Ground-truth datasets required for robust model training are either unavailable or prohibitively expensive to curate in the Indian context.
• Lack of domain adaptation: International solutions are rarely validated on India-specific socio-technical parameters.
• Computational inefficiency: State-of-the-art models demand GPU infrastructure unavailable at most Tier-II institutions.

These issues collectively hinder technological adoption, particularly in resource-constrained settings prevalent across India. This proposal directly addresses these pain points by proposing novel, lightweight, and interpretable solutions grounded in ${kw}. The absence of dedicated funding for this specific intersection of problems — identified through a systematic review of 150+ publications — further motivates this proposal.`,

    objectives:
`The primary aim of this project is to advance the frontiers of "${title}" through the following specific objectives:

${objLines || `1. To conduct a systematic literature survey and gap analysis in the domain of ${kw}.
2. To design and develop a novel computational framework leveraging ${keywords[0] || 'advanced'} techniques.
3. To curate and annotate a benchmark dataset representative of Indian contextual parameters.
4. To validate the proposed system against established baselines on publicly available and self-curated datasets.
5. To disseminate findings through high-impact peer-reviewed journals and national/international conferences.
6. To file intellectual property (patent) for any novel algorithmic contributions arising from the research.
7. To develop a prototype demonstrator suitable for technology transfer to industry partners.`}`,

    methodology:
`The research will be conducted in four systematic phases over ${grant.duration}:

Phase 1 – Literature Review & Dataset Preparation (Months 1–6)
• Comprehensive survey of 200+ papers using Scopus, Web of Science, and IEEE Xplore.
• Identification of benchmark datasets; procurement of domain-specific data with ethical clearance.
• Establishment of evaluation metrics and baseline implementations.

Phase 2 – Model Design & Development (Months 7–18)
• Architectural design of the proposed ${keywords[0] || 'AI'}-based framework.
• Implementation using Python (PyTorch / TensorFlow), with version-controlled repositories.
• Ablation studies to isolate the contribution of each proposed component.

Phase 3 – Experimental Validation (Months 19–28)
• Quantitative evaluation on multiple benchmark datasets.
• Comparison with 5+ state-of-the-art methods using standard metrics (Accuracy, F1, AUC, BLEU, etc.).
• Statistical significance testing (Wilcoxon signed-rank, t-test at p < 0.05).

Phase 4 – Deployment & Dissemination (Months 29–${grant.duration.includes('3') ? '36' : '48'})
• Prototype development and integration testing.
• Publication of results in SCIE Q1/Q2 journals; conference presentations.
• Patent filing and industry demonstration day.`,

    outcomes:
`This project is expected to deliver the following measurable outcomes:

Academic Output:
• Minimum 4 research papers in SCIE-indexed journals (target: Q1/Q2 impact factor ≥ 3.0)
• 2 conference papers at reputed IEEE/ACM/Springer venues
• 1 book chapter in Springer/Elsevier edited volume

Intellectual Property:
• 1 Indian Patent Application on the novel algorithmic framework
• Potential PCT filing based on technology novelty

Capacity Building:
• Training of 2 PhD scholars and 4 M.E./M.Tech. students
• Organisation of 1 national-level workshop on ${keywords[0] || 'the research domain'}
• Collaboration MoU with at least 1 industry partner

Societal & National Impact:
• Open-source release of curated dataset and codebase
• Technology demonstrator available for MSME adoption
• Alignment with Make in India, Digital India, and NEP 2020 goals`,

    budget:
`The total estimated budget for this ${grant.duration} research project is requested at ${grant.maxAmount}, broken down as follows:

Head A – Human Resources (≈ 40%)
• 1 Junior Research Fellow (JRF): ₹37,000/month × 36 months = ₹13.32 Lakhs
• 1 Senior Research Fellow (SRF): ₹42,000/month × 12 months = ₹5.04 Lakhs
• 1 Project Assistant: ₹20,000/month × 24 months = ₹4.80 Lakhs

Head B – Equipment & Infrastructure (≈ 30%)
• High-performance GPU workstation (NVIDIA RTX 4090): ₹3.50 Lakhs
• Annotation tools and data collection hardware: ₹1.50 Lakhs
• Server hosting and cloud compute credits: ₹1.00 Lakh

Head C – Consumables & Software (≈ 10%)
• Software licenses, domain datasets, and API subscriptions: ₹1.20 Lakhs
• Office consumables, printing, and lab materials: ₹0.80 Lakhs

Head D – Travel & Dissemination (≈ 10%)
• National/international conference travel (4 trips): ₹2.00 Lakhs
• Journal publication charges (APCs): ₹1.50 Lakhs

Head E – Institutional Overhead / Contingency (≈ 10%)
• Overhead as per institute norms: ₹1.00 Lakh
• Contingency reserve: ₹0.50 Lakhs

All expenditures will be subject to GFR 2017 norms, audited annually, and reported through the ${grant.name} utilisation certificate mechanism.`,

    timeline:
`PROJECT TIMELINE (${grant.duration})

Year 1 (Months 1–12)
├── M1–M3   : Project kickoff, lab setup, JRF recruitment
├── M1–M6   : Systematic literature survey & gap analysis
├── M4–M8   : Dataset curation, annotation & pre-processing
├── M7–M12  : Baseline model implementation & evaluation
└── M12     : Progress report submission to ${grant.name}

Year 2 (Months 13–24)
├── M13–M18 : Novel framework design & first prototype
├── M15–M20 : Ablation studies and hyperparameter tuning
├── M19–M22 : Comparative evaluation with SOTA methods
├── M20–M24 : First journal paper submission (Q1 target)
└── M24     : Mid-term review & SRF upgrade

Year 3 (Months 25–36)
├── M25–M28 : Deployment-ready prototype development
├── M26–M30 : Patent application drafting and filing
├── M28–M33 : Second & third journal paper submissions
├── M30–M34 : National workshop organisation
├── M33–M36 : Industry demo, MoU formalisation
└── M36     : Final report, utilisation certificate & project closure`,
  };
}

interface ResearchGrantsProps {
  user: UserType;
}

// ── Source registry ──────────────────────────────────────────────────────────
const SOURCES = [
  {
    id: 'google_scholar',
    name: 'Google Scholar',
    color: '#4285F4',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    badge: 'bg-blue-500',
    icon: '𝐺',
    desc: 'Academic search engine covering all disciplines'
  },
  {
    id: 'scopus',
    name: 'Scopus',
    color: '#FF6C00',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    badge: 'bg-orange-500',
    icon: 'S',
    desc: 'Elsevier abstract & citation database'
  },
  {
    id: 'orcid',
    name: 'ORCID',
    color: '#A6CE39',
    bg: 'bg-green-500/10',
    border: 'border-green-500/40',
    text: 'text-green-400',
    badge: 'bg-green-500',
    icon: 'O',
    desc: 'Open Researcher & Contributor ID registry'
  },
  {
    id: 'crossref',
    name: 'Crossref',
    color: '#CE1A24',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-400',
    badge: 'bg-red-500',
    icon: '✕',
    desc: 'DOI registration agency metadata'
  },
  {
    id: 'dblp',
    name: 'DBLP',
    color: '#0099CC',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500',
    icon: 'D',
    desc: 'Computer science bibliography database'
  },
  {
    id: 'semantic_scholar',
    name: 'Semantic Scholar',
    color: '#A020F0',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    badge: 'bg-purple-500',
    icon: 'Σ',
    desc: 'AI-powered research tool by Allen Institute'
  },
];

// ── Simulated publication pool per source ───────────────────────────────────
const MOCK_POOL: Record<string, any[]> = {
  google_scholar: [
    {
      id: 'gs-001',
      title: 'Deep Learning-Based Semantic Segmentation of Retinal Fundus Images Using Attention U-Net',
      authors: 'R. Meenakshi, S. Suresh, V. Krishnamurthy',
      journal: 'IEEE Transactions on Medical Imaging',
      year: 2025,
      doi: '10.1109/TMI.2025.3012345',
      abstract: 'We propose a novel attention U-Net architecture for retinal vessel segmentation achieving 98.2% sensitivity on the DRIVE dataset, outperforming prior CNN-based methods by 3.1%.',
      citation_count: 42,
      type: 'journal',
      isNew: true,
    },
    {
      id: 'gs-002',
      title: 'Hybrid Transformer-CNN Model for Automated Glaucoma Detection in OCT Scans',
      authors: 'R. Meenakshi, A. Ramesh',
      journal: 'Pattern Recognition Letters',
      year: 2024,
      doi: '10.1016/j.patrec.2024.08.010',
      abstract: 'A hybrid vision-transformer model fused with ResNet-50 backbone for glaucoma staging from OCT B-scans. Achieves 96.8% AUC on GS-2000 dataset.',
      citation_count: 18,
      type: 'journal',
      isNew: false,
    },
  ],
  scopus: [
    {
      id: 'sc-001',
      title: 'Federated Learning for Privacy-Preserving Medical Image Analysis Across Multi-Institutional Data Silos',
      authors: 'R. Meenakshi, P. Chandran, T. Lakshmi',
      journal: 'Computers in Biology and Medicine',
      year: 2025,
      doi: '10.1016/j.compbiomed.2025.107892',
      abstract: 'A federated framework enabling collaborative model training across five hospitals without centralising patient images. Demonstrates 1.8% accuracy improvement over centralised baselines.',
      citation_count: 11,
      type: 'journal',
      isNew: true,
    },
  ],
  orcid: [
    {
      id: 'or-001',
      title: 'Explainable AI for Clinical Decision Support in Cardiology: A Systematic Review',
      authors: 'R. Meenakshi, S. Kumar',
      journal: 'Artificial Intelligence in Medicine',
      year: 2024,
      doi: '10.1016/j.artmed.2024.102630',
      abstract: 'Surveys 87 XAI studies in cardiology, categorising explanation methods (SHAP, LIME, GradCAM) and evaluating clinical acceptance rates. Identifies key open challenges.',
      citation_count: 29,
      type: 'journal',
      isNew: false,
    },
    {
      id: 'or-002',
      title: 'Lightweight MobileNet-YOLO Fusion for Real-Time Crowd Density Estimation on Edge Devices',
      authors: 'R. Meenakshi, J. Priya, M. Senthil',
      journal: 'IEEE Access',
      year: 2025,
      doi: '10.1109/ACCESS.2025.3201456',
      abstract: 'A compressed detection pipeline running at 42 FPS on Raspberry Pi 4, suitable for IoT-based public safety monitoring systems.',
      citation_count: 7,
      type: 'journal',
      isNew: true,
    },
  ],
  crossref: [
    {
      id: 'cr-001',
      title: 'Transformer-Based Named Entity Recognition for Tamil Clinical Text: Challenges and Solutions',
      authors: 'R. Meenakshi, K. Arjun, S. Devi',
      journal: 'ACM Transactions on Asian and Low-Resource Language Information Processing',
      year: 2024,
      doi: '10.1145/3638545',
      abstract: 'Proposes a domain-adapted XLM-RoBERTa model for Tamil EHR text, achieving F1 of 0.87, addressing morphological complexity of Dravidian languages in NLP.',
      citation_count: 15,
      type: 'journal',
      isNew: false,
    },
  ],
  dblp: [
    {
      id: 'db-001',
      title: 'Graph Neural Networks for Distributed Intrusion Detection in IoT Networks',
      authors: 'R. Meenakshi, B. Shankar',
      journal: 'Proc. IEEE INFOCOM Workshop on Secure Edge Computing',
      year: 2025,
      doi: '10.1109/INFOCOMWKSHPS60882.2025.00312',
      abstract: 'Proposes a GNN-based anomaly detection system deployed at edge nodes, reducing false-positive rates by 23% compared to LSTM baselines under adversarial packet injection.',
      citation_count: 4,
      type: 'conference',
      isNew: true,
    },
    {
      id: 'db-002',
      title: 'Optimising FPGA-Based Accelerators for Sparse Matrix Computations in Scientific HPC Workloads',
      authors: 'R. Meenakshi, C. Balachandran, T. Kumar',
      journal: 'Proc. IEEE FPL 2024',
      year: 2024,
      doi: '10.1109/FPL64 605.2024.00041',
      abstract: 'Implements sparse BLAS kernels on Xilinx Alveo U250, achieving 2.4× throughput over GPU baselines for genomics alignment workloads.',
      citation_count: 9,
      type: 'conference',
      isNew: false,
    },
  ],
  semantic_scholar: [
    {
      id: 'ss-001',
      title: 'Diffusion Models for High-Fidelity Synthetic Medical Image Generation and Data Augmentation',
      authors: 'R. Meenakshi, H. Gupta, L. Pradeep',
      journal: 'Medical Image Analysis',
      year: 2025,
      doi: '10.1016/j.media.2025.103214',
      abstract: 'Uses denoising diffusion probabilistic models to synthesise paired MRI and CT slices, improving downstream segmentation accuracy by 4.7% on three public benchmarks.',
      citation_count: 21,
      type: 'journal',
      isNew: true,
    },
  ],
};

// ── Main Component ─────────────────────────────────────────────────────────
export const ResearchGrants: React.FC<ResearchGrantsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'proposal'>('overview');

  // ── Overview states ──────────────────────────────────────────────────────
  const [publications, setPublications] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPubModalOpen, setIsPubModalOpen] = useState(false);
  const [newPubTitle, setNewPubTitle] = useState('');
  const [newPubVenue, setNewPubVenue] = useState('');
  const [newPubType, setNewPubType] = useState('journal');
  const [newPubYear, setNewPubYear] = useState(2026);
  const [newPubAuthors, setNewPubAuthors] = useState('');
  const [newPubDoi, setNewPubDoi] = useState('');

  // ── Chat states ──────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [streamingTraces, setStreamingTraces] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Import states ────────────────────────────────────────────────────────
  const [profileId, setProfileId] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(['google_scholar', 'orcid', 'semantic_scholar'])
  );
  const [syncStatus, setSyncStatus] = useState<Record<string, 'idle' | 'syncing' | 'done' | 'error'>>({});
  const [syncProgress, setSyncProgress] = useState<Record<string, number>>({});
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [expandedPub, setExpandedPub] = useState<string | null>(null);
  const [filterNew, setFilterNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importAllDone, setImportAllDone] = useState(false);

  // ── Grant Proposal states ────────────────────────────────────────────────
  const [selectedGrant, setSelectedGrant] = useState<typeof GRANT_CONFIGS[0] | null>(null);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalObjectives, setProposalObjectives] = useState('');
  const [proposalKeyword, setProposalKeyword] = useState('');
  const [proposalKeywords, setProposalKeywords] = useState<string[]>([]);
  const [proposalSections, setProposalSections] = useState<Record<string, string>>({});
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [generatedSections, setGeneratedSections] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('abstract');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const proposalRef = useRef<HTMLDivElement>(null);

  const addKeyword = () => {
    const kw = proposalKeyword.trim();
    if (kw && !proposalKeywords.includes(kw)) {
      setProposalKeywords(prev => [...prev, kw]);
    }
    setProposalKeyword('');
  };

  const removeKeyword = (kw: string) => setProposalKeywords(prev => prev.filter(k => k !== kw));

  // Simulate streaming a section character by character
  const streamSection = async (key: string, content: string) => {
    setGeneratingSection(key);
    setProposalSections(prev => ({ ...prev, [key]: '' }));
    const chunkSize = 8;
    for (let i = 0; i < content.length; i += chunkSize) {
      await new Promise(r => setTimeout(r, 18));
      setProposalSections(prev => ({ ...prev, [key]: content.slice(0, i + chunkSize) }));
    }
    setProposalSections(prev => ({ ...prev, [key]: content }));
    setGeneratedSections(prev => new Set([...prev, key]));
    setGeneratingSection(null);
  };

  const handleGenerateProposal = async () => {
    if (!selectedGrant || !proposalTitle.trim()) return;
    setIsGenerating(true);
    setGenerationDone(false);
    setProposalSections({});
    setGeneratedSections(new Set());
    setExpandedSection('abstract');

    const content = generateProposalContent(selectedGrant, proposalTitle, proposalObjectives, proposalKeywords);
    for (const section of PROPOSAL_SECTIONS) {
      await streamSection(section.key, content[section.key]);
      await new Promise(r => setTimeout(r, 120));
    }
    setIsGenerating(false);
    setGenerationDone(true);
  };

  const handleCopySection = (key: string) => {
    navigator.clipboard.writeText(proposalSections[key] || '');
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadProposalPDF = () => {
    if (!selectedGrant || Object.keys(proposalSections).length === 0) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Cover header
    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, pageW, 42, 'F');
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESEARCH GRANT PROPOSAL', 14, 14);
    doc.setFontSize(10);
    doc.text(proposalTitle, 14, 22, { maxWidth: pageW - 28 });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Funding Agency: ${selectedGrant.name} – ${selectedGrant.fullName}`, 14, 32);
    doc.text(`Scheme: ${selectedGrant.schemes[0]}  |  Max Amount: ${selectedGrant.maxAmount}  |  Duration: ${selectedGrant.duration}`, 14, 38);

    doc.setTextColor(0);
    let y = 52;

    PROPOSAL_SECTIONS.forEach(sec => {
      const text = proposalSections[sec.key] || '';
      if (!text) return;

      if (y > 250) { doc.addPage(); y = 14; }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(sec.label.toUpperCase(), 14, y);
      y += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(text, pageW - 28);
      lines.forEach((line: string) => {
        if (y > 275) { doc.addPage(); y = 14; }
        doc.text(line, 14, y);
        y += 5;
      });
      y += 6;
    });

    doc.save(`Grant_Proposal_${selectedGrant.name}_${proposalTitle.slice(0, 30).replace(/\s+/g, '_')}.pdf`);
  };

  const canGenerate = !!selectedGrant && proposalTitle.trim().length > 5;

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const pubData = await api.getPublications();
      const grantData = await api.getGrants();
      const deadlineData = await api.getResearchDeadlines();
      setPublications(pubData);
      setGrants(grantData);
      setDeadlines(deadlineData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Publication add (manual) ─────────────────────────────────────────────
  const handleAddPublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPubTitle || !newPubVenue) return;
    try {
      await api.logPublication(newPubTitle, newPubVenue, newPubType, newPubYear, newPubAuthors, newPubDoi);
      setIsPubModalOpen(false);
      setNewPubTitle(''); setNewPubVenue(''); setNewPubAuthors(''); setNewPubDoi('');
      loadData();
    } catch (e) { console.error(e); }
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: Math.random().toString(), role: 'user', content: chatInput, timestamp: new Date().toLocaleTimeString() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput(''); setStreamingText(''); setStreamingTraces([]); setIsLoading(true);
    api.streamChat('agent4', chatInput, chatMessages,
      (chunk) => setStreamingText(prev => prev + chunk),
      (trace) => setStreamingTraces(prev => {
        const idx = prev.findIndex(t => t.name === trace.name);
        if (idx >= 0) { const u = [...prev]; u[idx] = trace; return u; }
        return [...prev, trace];
      }),
      (toolCalls, richData) => {
        setChatMessages(prev => [...prev, { id: Math.random().toString(), role: 'assistant', content: streamingText, timestamp: new Date().toLocaleTimeString(), toolCalls, richData }]);
        setStreamingText(''); setIsLoading(false); loadData();
      },
      (err) => { console.error(err); setIsLoading(false); }
    );
  };

  useEffect(() => {
    if (chatMessages.length > 1 || streamingText) chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages, streamingText]);

  // ── Sync simulation ──────────────────────────────────────────────────────
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncDone(false);
    setDiscovered([]);
    setImported(new Set());
    setImportAllDone(false);

    const sources = Array.from(selectedSources);
    const initialStatus: Record<string, 'idle' | 'syncing' | 'done' | 'error'> = {};
    const initialProgress: Record<string, number> = {};
    sources.forEach(s => { initialStatus[s] = 'idle'; initialProgress[s] = 0; });
    setSyncStatus(initialStatus);
    setSyncProgress(initialProgress);

    const allFound: any[] = [];

    for (const sourceId of sources) {
      setSyncStatus(prev => ({ ...prev, [sourceId]: 'syncing' }));

      // Animate progress
      for (let p = 0; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 120));
        setSyncProgress(prev => ({ ...prev, [sourceId]: p }));
      }

      const pool = MOCK_POOL[sourceId] || [];
      pool.forEach(pub => {
        allFound.push({ ...pub, source: sourceId });
      });

      setSyncStatus(prev => ({ ...prev, [sourceId]: 'done' }));
      setSyncProgress(prev => ({ ...prev, [sourceId]: 100 }));
      await new Promise(r => setTimeout(r, 200));
    }

    setDiscovered(allFound);
    setIsSyncing(false);
    setSyncDone(true);
  };

  const toggleSource = (id: string) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImportOne = (pub: any) => {
    setImported(prev => new Set([...prev, pub.id]));
    // Also push to publications list locally
    setPublications(prev => {
      if (prev.find(p => p.doi === pub.doi)) return prev;
      return [...prev, {
        id: Math.random().toString(),
        title: pub.title,
        venue: pub.journal,
        type: pub.type,
        year: pub.year,
        co_authors: pub.authors,
        doi: pub.doi,
        citation_count: pub.citation_count,
      }];
    });
  };

  const handleImportAll = () => {
    const newPubs = discovered.filter(p => !imported.has(p.id));
    newPubs.forEach(p => handleImportOne(p));
    setImportAllDone(true);
  };

  const filteredDiscovered = discovered.filter(p => {
    const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.authors.toLowerCase().includes(searchQuery.toLowerCase()) || p.journal.toLowerCase().includes(searchQuery.toLowerCase());
    const matchNew = !filterNew || p.isNew;
    return matchSearch && matchNew;
  });

  const newCount = discovered.filter(p => p.isNew).length;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const pubsByYear: Record<number, any[]> = {};
  publications.forEach(p => { pubsByYear[p.year] = pubsByYear[p.year] || []; pubsByYear[p.year].push(p); });
  const yearsSorted = Object.keys(pubsByYear).map(Number).sort((a, b) => b - a);

  const getDaysLeft = (targetStr: string) => {
    const today = new Date('2026-07-27');
    const target = new Date(targetStr);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  const getSource = (id: string) => SOURCES.find(s => s.id === id);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col relative bg-paper text-ink overflow-hidden font-ui">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Seal agentId="agent4" icon={GraduationCap} size="md" className="bg-sky-500" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Research &amp; Grants</h1>
            <p className="text-xs text-ink-muted">Career &amp; growth: log publications, sync from academic databases, view funding timelines.</p>
          </div>
        </div>
        {activeTab === 'overview' && (
          <Button
            onClick={() => setIsPubModalOpen(true)}
            className="bg-sky-500 hover:bg-sky-700 text-black text-xs font-mono py-2 flex items-center gap-1"
          >
            <Plus size={14} /> LOG PUBLICATION
          </Button>
        )}
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 bg-surface p-1 rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200 ${activeTab === 'overview' ? 'bg-sky-500 text-black shadow' : 'text-ink-muted hover:text-ink'}`}
        >
          <BookOpen size={13} /> Publications &amp; Grants
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200 relative ${activeTab === 'import' ? 'bg-sky-500 text-black shadow' : 'text-ink-muted hover:text-ink'}`}
        >
          <Zap size={13} /> Auto Publication Import
          {newCount > 0 && activeTab !== 'import' && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">{newCount}</span>
          )}
        </button>
      <button
            onClick={() => setActiveTab('proposal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200 ${activeTab === 'proposal' ? 'bg-sky-500 text-black shadow' : 'text-ink-muted hover:text-ink'}`}
          >
            <BookOpen size={13} /> Grant Proposal Generator
          </button>
          </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 – OVERVIEW
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-6 overflow-hidden pb-20">

          {/* Left: Deadlines & Grants */}
          <div className="lg:col-span-4 flex flex-col space-y-6 overflow-y-auto pr-1">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block">Upcoming Deadlines</span>
              <div className="space-y-3">
                {deadlines.map(d => {
                  const daysLeft = getDaysLeft(d.due_date);
                  const borderClass = daysLeft < 7 ? 'border-l-status-bad' : daysLeft < 30 ? 'border-l-status-warn' : 'border-l-sky-500';
                  return (
                    <div key={d.id} className={`p-3 bg-surface border border-border border-l-4 ${borderClass} rounded-radius-md flex items-center justify-between`}>
                      <div>
                        <div className="text-xs font-semibold">{d.title}</div>
                        <div className="text-[9px] text-ink-muted mt-0.5 uppercase font-mono">{d.type} • {d.due_date}</div>
                      </div>
                      <Badge variant={daysLeft < 7 ? 'danger' : daysLeft < 30 ? 'warning' : 'accent'}>{daysLeft} DAYS</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block">Matching Grants</span>
              <div className="space-y-3">
                {grants.map(g => {
                  const fitReason = g.title.includes('AI') || g.focus_area?.includes('AI') || g.title.includes('ML')
                    ? 'Matches your current ML research on medical segmentation.'
                    : 'Matches your advanced computing research background.';
                  return (
                    <Card key={g.id} className="p-4 border-l-4 border-l-sky-500/50 hover:border-l-sky-500 transition duration-200">
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold">{g.title}</div>
                        <span className="text-[10px] font-mono text-sky-400 font-semibold">{g.amount}</span>
                      </div>
                      <div className="text-[9px] text-ink-muted font-mono mt-1 uppercase">{g.funding_body} • Due: {g.deadline}</div>
                      <p className="text-[10px] italic text-sky-300 mt-2 bg-sky-500/5 p-1.5 rounded">Fit: {fitReason}</p>
                      <a href="#" className="inline-flex items-center gap-1 text-[9px] font-mono text-sky-400 hover:text-sky-300 underline mt-2">
                        View full call <ExternalLink size={8} />
                      </a>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Publications Timeline */}
          <div className="lg:col-span-6 flex flex-col overflow-y-auto pr-1">
            <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block mb-3">Publications Timeline</span>
            {publications.length === 0 ? (
              <Card className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Seal agentId="agent4" icon={GraduationCap} size="lg" className="bg-sky-600/20 mb-4" />
                <div className="text-xs text-ink font-semibold">No publications logged yet</div>
                <p className="text-[10px] text-ink-muted mt-1 max-w-xs">Log your first publication or sync from academic databases.</p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={() => setIsPubModalOpen(true)} className="bg-sky-500 hover:bg-sky-600 text-black text-xs font-mono">
                    Log manually
                  </Button>
                  <Button size="sm" onClick={() => setActiveTab('import')} variant="outline" className="text-xs font-mono flex items-center gap-1">
                    <Zap size={11} /> Auto Import
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 p-6 space-y-6">
                {yearsSorted.map(year => (
                  <div key={year} className="relative pl-6 border-l border-border/80 last:border-transparent pb-4">
                    <div className="absolute -left-[4.5px] top-1 w-2.5 h-2.5 rounded-full bg-sky-500 border-2 border-paper" />
                    <div className="font-display text-sm font-semibold text-sky-400 mb-2 font-mono">{year}</div>
                    <div className="space-y-4">
                      {pubsByYear[year].map(p => (
                        <div key={p.id} className="pb-3 border-b border-border/40 last:border-none">
                          <div className="text-xs font-medium text-ink leading-snug">{p.title}</div>
                          <div className="text-[10px] text-ink-muted mt-1">Authors: {p.co_authors || user.name}</div>
                          <div className="flex items-center gap-3 text-[9px] font-mono text-sky-400/80 mt-1">
                            <span className="uppercase">{p.type}</span>
                            <span>•</span>
                            <span className="truncate">{p.venue}</span>
                            <span>•</span>
                            <Badge variant="accent" className="px-1 py-0 bg-sky-500/10 text-sky-400 border-none text-[8px]">
                              {p.citation_count} CITATIONS
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 – AUTO PUBLICATION IMPORT
         ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'import' && (
        <div className="flex-1 overflow-y-auto pb-6 space-y-6">

          {/* ── Section 1: Config Panel ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Profile ID Input */}
            <Card className="lg:col-span-1 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Users size={15} className="text-sky-400" />
                </div>
                <div>
                  <div className="text-xs font-bold">Researcher Profile</div>
                  <div className="text-[10px] text-ink-muted">Your ORCID / Scholar ID</div>
                </div>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 block">ORCID iD</label>
                  <input
                    type="text"
                    placeholder="0000-0002-XXXX-XXXX"
                    value={profileId}
                    onChange={e => setProfileId(e.target.value)}
                    className="w-full bg-paper border border-border text-ink text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 placeholder-ink-muted/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 block">Author Name Variant</label>
                  <input
                    type="text"
                    placeholder="e.g. R. Meenakshi"
                    defaultValue={user.name || ''}
                    className="w-full bg-paper border border-border text-ink text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500/50 placeholder-ink-muted/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 block">Scopus Author ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 57210XXXXXXXX"
                    className="w-full bg-paper border border-border text-ink text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500/50 placeholder-ink-muted/40"
                  />
                </div>
              </div>
            </Card>

            {/* Source Selection */}
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <Database size={15} className="text-sky-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Sync Sources</div>
                    <div className="text-[10px] text-ink-muted">Toggle databases to include in sync</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-sky-400">{selectedSources.size} / {SOURCES.length} selected</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SOURCES.map(src => {
                  const active = selectedSources.has(src.id);
                  const status = syncStatus[src.id];
                  return (
                    <button
                      key={src.id}
                      onClick={() => toggleSource(src.id)}
                      disabled={isSyncing}
                      className={`relative flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all duration-200 ${active ? `${src.bg} ${src.border} ${src.text}` : 'border-border text-ink-muted hover:border-sky-500/30'} disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: active ? src.color + '22' : 'transparent', color: active ? src.color : 'inherit' }}>
                          {src.icon}
                        </span>
                        {active && <Check size={11} className={src.text} />}
                      </div>
                      <div className="text-[10px] font-bold">{src.name}</div>
                      {status === 'syncing' && (
                        <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl overflow-hidden">
                          <div className="h-full bg-sky-400 animate-pulse" style={{ width: `${syncProgress[src.id] || 0}%`, transition: 'width 0.3s' }} />
                        </div>
                      )}
                      {status === 'done' && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 size={10} className="text-green-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ── Sync Button ───────────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={isSyncing || selectedSources.size === 0}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-mono font-bold transition-all duration-200 shadow-lg ${isSyncing || selectedSources.size === 0 ? 'bg-border text-ink-muted cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-400 text-black hover:shadow-sky-500/30 hover:shadow-xl'}`}
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing Publications...' : 'Start Sync'}
            </button>

            {syncDone && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-green-400 font-bold">Sync complete —</span>
                <span className="text-ink">{discovered.length} publications found</span>
                {newCount > 0 && <Badge variant="danger" className="text-[9px]">{newCount} NEW</Badge>}
              </div>
            )}
          </div>

          {/* ── Source Progress Cards ─────────────────────────────────── */}
          {Object.keys(syncStatus).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {SOURCES.filter(s => selectedSources.has(s.id)).map(src => {
                const status = syncStatus[src.id] || 'idle';
                const progress = syncProgress[src.id] || 0;
                const count = (MOCK_POOL[src.id] || []).length;
                return (
                  <div key={src.id} className={`rounded-xl border p-3 text-center transition-all ${status === 'done' ? `${src.bg} ${src.border}` : 'bg-surface border-border'}`}>
                    <div className="text-lg font-bold mb-1" style={{ color: status === 'done' ? src.color : undefined }}>{src.icon}</div>
                    <div className={`text-[10px] font-bold mb-1 ${status === 'done' ? src.text : 'text-ink-muted'}`}>{src.name}</div>
                    {status === 'syncing' && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-ink-muted">{progress}%</span>
                      </div>
                    )}
                    {status === 'done' && <div className={`text-[10px] font-mono ${src.text}`}>{count} found ✓</div>}
                    {status === 'idle' && <div className="text-[9px] font-mono text-ink-muted/50">Waiting…</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Discovered Publications ───────────────────────────────── */}
          {discovered.length > 0 && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold">{filteredDiscovered.length} Publications Discovered</div>
                  <button
                    onClick={() => setFilterNew(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${filterNew ? 'bg-red-500/15 border-red-500/50 text-red-400' : 'bg-surface border-border text-ink-muted hover:border-sky-500/40'}`}
                  >
                    <Sparkles size={10} /> NEW ONLY {newCount > 0 && `(${newCount})`}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      placeholder="Search title, author, journal…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-paper border border-border text-ink text-[11px] font-mono rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:border-sky-500 w-52"
                    />
                  </div>
                  <button
                    onClick={handleImportAll}
                    disabled={importAllDone || filteredDiscovered.every(p => imported.has(p.id))}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-[10px] font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download size={12} /> Import All
                  </button>
                </div>
              </div>

              {/* Publication Cards */}
              <div className="space-y-3">
                {filteredDiscovered.map(pub => {
                  const src = getSource(pub.source);
                  const isImported = imported.has(pub.id);
                  const isExpanded = expandedPub === pub.id;
                  return (
                    <div
                      key={pub.id}
                      className={`rounded-xl border transition-all duration-200 ${isImported ? 'border-green-500/30 bg-green-500/5' : pub.isNew ? 'border-sky-500/40 bg-sky-500/5' : 'border-border bg-surface'}`}
                    >
                      <div className="flex items-start gap-3 p-4">
                        {/* Source badge */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${src?.bg} ${src?.border} border flex items-center justify-center text-sm font-bold`} style={{ color: src?.color }}>
                          {src?.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                {pub.isNew && <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">NEW</span>}
                                <span className={`text-[9px] font-mono font-bold ${src?.text}`}>{src?.name}</span>
                                <span className="text-[9px] font-mono text-ink-muted uppercase">{pub.type}</span>
                                <span className="text-[9px] font-mono text-ink-muted">·</span>
                                <span className="text-[9px] font-mono text-ink-muted">{pub.year}</span>
                              </div>
                              <div className="text-xs font-semibold text-ink leading-snug">{pub.title}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => setExpandedPub(isExpanded ? null : pub.id)}
                                className="text-ink-muted hover:text-sky-400 transition-colors"
                                title="View details"
                              >
                                <Eye size={13} />
                              </button>
                              {isImported ? (
                                <div className="flex items-center gap-1 text-[9px] font-mono text-green-400 font-bold">
                                  <CheckCircle2 size={12} /> Imported
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleImportOne(pub)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-[9px] font-mono font-bold transition-all"
                                >
                                  <Download size={10} /> Import
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                              <Users size={10} />
                              <span className="truncate max-w-[220px]">{pub.authors}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                              <BookOpen size={10} />
                              <span className="truncate max-w-[180px]">{pub.journal}</span>
                            </div>
                            {pub.doi && (
                              <div className="flex items-center gap-1 text-[10px] text-sky-400/80">
                                <Link2 size={10} />
                                <span className="font-mono truncate max-w-[160px]">{pub.doi}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                              <Quote size={10} />
                              <span className="font-mono font-bold">{pub.citation_count} citations</span>
                            </div>
                          </div>

                          {/* Expandable Abstract */}
                          {isExpanded && (
                            <div className="mt-3 p-3 bg-paper border border-border/50 rounded-lg">
                              <div className="text-[9px] font-mono text-ink-muted uppercase mb-1.5 flex items-center gap-1">
                                <FileText size={9} /> Abstract
                              </div>
                              <p className="text-[11px] text-ink-muted leading-relaxed">{pub.abstract}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredDiscovered.length === 0 && (
                <div className="text-center py-10 text-ink-muted font-mono text-xs">
                  No publications match your filter.
                </div>
              )}
            </div>
          )}

          {/* Empty state before sync */}
          {!syncDone && discovered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                <Database size={36} className="text-sky-400" />
              </div>
              <div className="text-center max-w-sm">
                <h2 className="font-display text-lg font-bold text-ink mb-1">Sync Your Publications</h2>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Select your sources above, enter your researcher profile IDs, and click <strong>Start Sync</strong> to automatically detect and import publications.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {SOURCES.map(s => (
                  <span key={s.id} className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold ${s.bg} ${s.text} border ${s.border}`}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

        {/* ── Grant Proposal Generator UI ───────────────────────────────────── */}
        {activeTab === 'proposal' && (
          <div className="flex-1 overflow-y-auto pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Select Grant</label>
                <select
                  value={selectedGrant?.id || ''}
                  onChange={e => setSelectedGrant(GRANT_CONFIGS.find(g => g.id === e.target.value) || null)}
                  className="w-full bg-paper border border-border text-ink text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose --</option>
                  {GRANT_CONFIGS.map(g => (
                    <option key={g.id} value={g.id}>{g.name} – {g.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Research Title</label>
                <input
                  type="text"
                  placeholder="Enter title..."
                  value={proposalTitle}
                  onChange={e => setProposalTitle(e.target.value)}
                  className="w-full bg-paper border border-border text-ink text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Objectives (one per line)</label>
              <textarea
                rows={4}
                placeholder="Enter objectives…"
                value={proposalObjectives}
                onChange={e => setProposalObjectives(e.target.value)}
                className="w-full bg-paper border border-border text-ink text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="Add keyword"
                value={proposalKeyword}
                onChange={e => setProposalKeyword(e.target.value)}
                className="flex-1 bg-paper border border-border text-ink text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={addKeyword}
                className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-black text-xs font-mono rounded"
              >Add</button>
            </div>
            {proposalKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {proposalKeywords.map(kw => (
                  <span key={kw} className="px-2 py-1 bg-sky-500/10 text-sky-400 text-xs font-mono rounded flex items-center gap-1">
                    {kw}<X size={12} className="cursor-pointer" onClick={() => removeKeyword(kw)} />
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleGenerateProposal}
                disabled={!canGenerate || isGenerating}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black text-xs font-mono rounded disabled:opacity-40"
              >{isGenerating ? 'Generating...' : 'Generate Proposal'}</button>
              {generationDone && (
                <button
                  onClick={handleDownloadProposalPDF}
                  className="px-4 py-2 bg-emerald-500 hover:emerald-400 text-black text-xs font-mono rounded"
                >Download PDF</button>
              )}
            </div>
            {/* Sections */}
            <div className="mt-6 space-y-4">
              {PROPOSAL_SECTIONS.map(sec => (
                <div key={sec.key} className="border border-border p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <sec.icon className={sec.color} />
                      <span className="font-medium">{sec.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {generatedSections.has(sec.key) && (
                        <>
                          <button
                            onClick={() => handleCopySection(sec.key)}
                            className="text-xs text-sky-500 hover:underline"
                          >{copiedSection === sec.key ? 'Copied!' : 'Copy'}</button>
                          <button
                            onClick={() => setExpandedSection(expandedSection === sec.key ? null : sec.key)}
                            className="text-xs text-ink-muted hover:text-ink"
                          >{expandedSection === sec.key ? 'Collapse' : 'Expand'}</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-ink-muted">
                    {generatingSection === sec.key ? (
                      <span className="text-sky-500">Generating...</span>
                    ) : proposalSections[sec.key] ? (
                      expandedSection === sec.key && (
                        <p>{proposalSections[sec.key]}</p>
                      )
                    ) : (
                      <span className="italic">Not generated</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── Add Publication Modal ───────────────────────────────────── */}
      {isPubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-surface border-sky-500/30 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-mono font-bold text-sky-400">LOG NEW PUBLICATION</span>
              <button onClick={() => setIsPubModalOpen(false)} className="text-ink-muted hover:text-ink text-xs font-mono">[X]</button>
            </div>
            <form onSubmit={handleAddPublication} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Paper Title</label>
                <Input placeholder="Enter title of publication" required value={newPubTitle} onChange={e => setNewPubTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Venue (Journal/Conference)</label>
                  <Input placeholder="e.g. IEEE Transactions" required value={newPubVenue} onChange={e => setNewPubVenue(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Type</label>
                  <select value={newPubType} onChange={e => setNewPubType(e.target.value)}
                    className="w-full bg-surface border border-border text-ink rounded-radius-sm py-2 px-3 outline-none">
                    <option value="journal">Journal</option>
                    <option value="conference">Conference</option>
                    <option value="patent">Patent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Year</label>
                  <Input type="number" required value={newPubYear} onChange={e => setNewPubYear(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">DOI / Link (Optional)</label>
                  <Input placeholder="e.g. doi.org/10.11" value={newPubDoi} onChange={e => setNewPubDoi(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Co-Authors (comma-separated)</label>
                <Input placeholder="e.g. S. Ram, V. Krish" value={newPubAuthors} onChange={e => setNewPubAuthors(e.target.value)} />
              </div>
              <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-black font-mono">
                SUBMIT PUBLICATION
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Research Chat (Overview only) ──────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="absolute bottom-6 right-6 w-full max-w-sm px-4 z-30">
          <Card className="shadow-2xl border-sky-500/40 border bg-surface/95 backdrop-blur p-4">
            <div className="text-[10px] font-mono text-sky-400 mb-2 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap size={12} /> Research Agent Chat
            </div>
            {chatMessages.length > 0 && (
              <div className="mb-3 max-h-36 overflow-y-auto border-b border-border/80 pb-2 text-xs">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className={`mb-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block p-2 rounded ${m.role === 'user' ? 'bg-sky-600/30' : 'bg-paper border border-border'}`}>{m.content}</span>
                  </div>
                ))}
                {streamingText && <div className="text-left"><span className="inline-block p-2 rounded bg-paper border border-border">{streamingText}</span></div>}
              </div>
            )}
            {streamingTraces.map((t, idx) => (
              <div key={idx} className="text-[8px] font-mono text-sky-500 mb-1">{t.name}... ({t.status})</div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Ask about grants fitting AI, co-authors..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                className="text-xs border-sky-500/20 focus:border-sky-500"
              />
              <Button onClick={handleSendChat} size="sm" className="bg-sky-500 hover:bg-sky-600 text-black">
                <Send size={10} />
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
