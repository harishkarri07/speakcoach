import { TechnicalDomain } from '../types/database';

export interface DomainInterviewTip {
  domainId: TechnicalDomain;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  coreFrameworks: { name: string; description: string; whenToQuote: string }[];
  highYieldQuestions: {
    question: string;
    keyPoints: string[];
    whatInterviewersLookFor: string;
    practicePrompt: string;
  }[];
  powerTerminology: { term: string; definition: string; exampleUsage: string }[];
  redFlagsToAvoid: { blunder: string; fix: string }[];
  deliveryFormulas: {
    name: string;
    steps: string[];
    sampleSnippet: string;
  };
}

export const DOMAIN_INTERVIEW_TIPS: Record<TechnicalDomain, DomainInterviewTip> = {
  soc_ir: {
    domainId: 'soc_ir',
    title: 'SOC Analyst & Incident Response',
    subtitle: 'Triage, Log Analysis, Containment & Threat Hunting',
    badge: 'Tier-1/2 SOC & DFIR',
    color: 'from-rose-500 to-red-600',
    coreFrameworks: [
      {
        name: 'PICERL (NIST SP 800-61)',
        description: 'Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned.',
        whenToQuote: 'Whenever asked "How do you handle a suspected malware/ransomware infection on an endpoint?"',
      },
      {
        name: 'MITRE ATT&CK Matrix',
        description: 'Standardized tactics (TA0001 Initial Access) and techniques (T1059 Command and Scripting Interpreter).',
        whenToQuote: 'Map raw alerts to adversary behaviors and explain kill-chain progression.',
      },
      {
        name: 'Diamond Model of Intrusion',
        description: 'Adversary, Capability, Infrastructure, Victim relationships.',
        whenToQuote: 'When correlating campaign infrastructure or multiple threat actor indicators.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'How do you triage an encoded PowerShell alert on a critical server?',
        keyPoints: [
          'Decode the command safely (-EncodedCommand is Base64 UTF-16LE, not encrypted)',
          'Check parent-child process tree (e.g. did Word/Excel spawn powershell.exe?)',
          'Isolate the host logically via EDR while keeping network connection to EDR intact',
          'Preserve volatile memory dump (RAM) before power-off or rebooting',
          'Extract network connections (IP/Port/Domain beaconing) and cross-reference with proxy/firewall logs',
        ],
        whatInterviewersLookFor: 'Understanding that shutting down destroys volatile evidence; systematic triage rather than panic.',
        practicePrompt: 'Walk me through how you would triage an alert showing encoded PowerShell executed by svchost.exe.',
      },
      {
        question: 'What is the difference between False Positive and True Positive, and how do you reduce alert fatigue?',
        keyPoints: [
          'True Positive: Legitimate malicious or non-compliant activity matching rule logic',
          'False Positive: Benign administrative or business activity flagged by overly broad rules',
          'Reduction: Rule tuning, whitelisting validated signed binaries/hashes, context enrichment, SOAR playbooks',
        ],
        whatInterviewersLookFor: 'Proactive engineering mindset; knowing that SOC analysts shouldn\'t just close tickets blindly.',
        practicePrompt: 'If your SIEM triggers 200 alerts a day for port scanning from an internal vulnerability scanner, how do you handle it?',
      },
      {
        question: 'Which Windows Event Logs (EVTX) do you check first during an investigation?',
        keyPoints: [
          'Event ID 4624 (Successful logon) & 4625 (Failed logon, Type 3 network, Type 10 RDP)',
          'Event ID 4688 / Sysmon 1 (Process Creation with command-line arguments)',
          'Event ID 7045 / 4697 (New Service Installed - persistence)',
          'Event ID 4720 (User account created) & 4728 (Member added to security group)',
          'Sysmon 3 (Network Connection) & Sysmon 7 (Image Loaded/DLL injection)',
        ],
        whatInterviewersLookFor: 'Specific Event IDs and Logon Types (e.g., Type 2 Interactive vs Type 3 Network vs Type 10 RemoteInteractive).',
        practicePrompt: 'Can you explain the significance of Windows Event ID 4624 Logon Types 3 and 10 in a lateral movement scenario?',
      },
    ],
    powerTerminology: [
      {
        term: 'Lateral Movement',
        definition: 'Techniques adversaries use to extend access to other systems on the network after initial compromise.',
        exampleUsage: '"We detected lateral movement using Pass-the-Hash over SMB (port 445) toward the Domain Controller."',
      },
      {
        term: 'Dwell Time',
        definition: 'The duration between an attacker\'s initial compromise and their detection/eviction by defenders.',
        exampleUsage: '"Our objective was to reduce mean dwell time from 16 days to under 4 hours via behavioral correlation."',
      },
      {
        term: 'Containment Boundary',
        definition: 'The perimeter isolating infected hosts and compromised accounts to prevent blast radius expansion.',
        exampleUsage: '"We established a network isolation boundary on the VLAN while revoking Active Directory session tokens."',
      },
      {
        term: 'Indicators of Compromise (IoC) vs Indicators of Attack (IoA)',
        definition: 'IoC represents forensic evidence of past compromise (hashes, IPs); IoA represents real-time intent/behavior.',
        exampleUsage: '"While IoCs help with retrospective hunting, we prioritize IoAs like unusual LSASS memory dumps."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Saying "I would pull the power plug or format the hard drive immediately."',
        fix: 'Never pull the plug! Explain that cutting power erases volatile RAM, injected shellcode, active network connections, and unwritten log buffers. Use EDR isolation or software network quarantine.',
      },
      {
        blunder: 'Saying "Base64 encoded means it is encrypted."',
        fix: 'Base64 is an encoding format, NOT encryption. It provides zero confidentiality and can be decoded by anyone with no key.',
      },
      {
        blunder: 'Ignoring post-incident documentation (Lessons Learned).',
        fix: 'Always mention closing the incident loop: root-cause analysis (RCA), IOC dissemination to firewall/EDR blocklists, and updating detection rules.',
      },
    ],
    deliveryFormulas: {
      name: 'The 4-Stage SOC Response Formula',
      steps: [
        '1. Scope & Verification (Confirm alert, check parent process, rule out known scanner)',
        '2. Evidence Preservation & Containment (Isolate host logically, dump RAM/artifacts)',
        '3. Investigation & Scope Analysis (Trace blast radius, check firewall/auth logs)',
        '4. Eradication & Hardening (Kill process, remove persistence, update SIEM rules)',
      ],
      sampleSnippet: '"First I verify the alert and inspect parent-child execution. Once confirmed, I contain the machine via EDR to prevent lateral movement while preserving RAM for Volatility analysis. Next I trace the blast radius via Event ID 4624, and finally eradicate the persistence hook before returning to production."',
    },
  },

  web_security: {
    domainId: 'web_security',
    title: 'Web Application Security & AppSec',
    subtitle: 'OWASP Top 10, Auth Vulnerabilities, API Security & Remediation',
    badge: 'AppSec & Pentesting',
    color: 'from-cyan-500 to-blue-600',
    coreFrameworks: [
      {
        name: 'OWASP Top 10 (2021)',
        description: 'A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A07 Identification & Auth Failures.',
        whenToQuote: 'Anchor all web vulnerability discussions to the official OWASP Top 10 categories.',
      },
      {
        name: 'Defense-in-Depth for Web',
        description: 'Client validation -> Input sanitization/parameterization -> Output encoding -> WAF -> Least privilege DB accounts.',
        whenToQuote: 'When asked how to prevent injections or XSS in enterprise architecture.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'What is the difference between Stored, Reflected, and DOM-based XSS?',
        keyPoints: [
          'Stored (Persistent): Payload stored in DB, executed every time a victim views the page',
          'Reflected (Non-persistent): Payload delivered via request URL/parameter, reflected immediately in response',
          'DOM-based: Vulnerability exists entirely on client-side JS executing unsafe sources (location.hash) to sinks (innerHTML)',
          'Defense: Context-aware output encoding, strict Content Security Policy (CSP), HttpOnly cookie flags',
        ],
        whatInterviewersLookFor: 'Accurate distinction between server-side rendering and client-side DOM sinks.',
        practicePrompt: 'Explain how DOM-based XSS differs from Reflected XSS, and how you would prevent it in a React app.',
      },
      {
        question: 'How does SQL Injection work, and why does parameterized querying completely prevent it?',
        keyPoints: [
          'Vulnerability: Untrusted user input concatenated directly into SQL command structure',
          'Parameterization (Prepared Statements): Separates SQL code logic from data; DB treats input strictly as literal values',
          'Defense: ORM with parameterized queries, input validation, DB user least privilege (no db_owner)',
        ],
        whatInterviewersLookFor: 'Knowing that escaping strings or blacklist filtering is insufficient; prepared statements are non-negotiable.',
        practicePrompt: 'Why is string escaping or regex blacklisting considered insufficient to prevent SQL injection in production?',
      },
      {
        question: 'What is IDOR (Insecure Direct Object Reference) and how do you test for it?',
        keyPoints: [
          'Class: Part of OWASP A01 (Broken Access Control)',
          'Mechanism: Application exposes internal object key (e.g., /api/user/1042/invoice) without server-side authorization check',
          'Testing: Multi-account testing (User A requests User B ID), Burp Suite AuthMatrix, UUID vs sequential ID analysis',
          'Fix: Robust server-side session-to-object RBAC verification, indirect reference maps',
        ],
        whatInterviewersLookFor: 'Emphasizing that using UUIDs does not fix IDOR—proper authorization checks on the server are mandatory.',
        practicePrompt: 'Does replacing integer IDs with UUIDv4 fix IDOR vulnerabilities? Explain your reasoning.',
      },
    ],
    powerTerminology: [
      {
        term: 'Same-Origin Policy (SOP)',
        definition: 'Critical browser security mechanism restricting how a document or script loaded from one origin interacts with resources from another.',
        exampleUsage: '"SOP prevents attacker.com from reading the DOM or AJAX responses of authenticated bank.com sessions."',
      },
      {
        term: 'CORS (Cross-Origin Resource Sharing)',
        definition: 'HTTP-header based mechanism enabling a server to relax the Same-Origin Policy for trusted origins.',
        exampleUsage: '"We identified a misconfigured Access-Control-Allow-Origin: * combined with Allow-Credentials: true."',
      },
      {
        term: 'CSRF Token (Synchronizer Token Pattern)',
        definition: 'A unique, unpredictable secret generated by the server and validated on state-changing requests.',
        exampleUsage: '"We mitigate CSRF using SameSite=Lax cookie attribute combined with anti-CSRF header tokens."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Claiming that client-side HTML5 form validation (required, maxlength) provides security.',
        fix: 'State clearly that attackers bypass client-side validation using proxies like Burp Suite or curl; all validation MUST happen on the server.',
      },
      {
        blunder: 'Confusing Authentication (AuthN - who you are) with Authorization (AuthZ - what you can access).',
        fix: 'Always use AuthN when discussing passwords/MFA/JWT tokens, and AuthZ when discussing permissions/roles/access control lists.',
      },
    ],
    deliveryFormulas: {
      name: 'The Vulnerability Triage Formula',
      steps: [
        '1. Root Cause Mechanism (Explain where data meets code)',
        '2. Impact / Blast Radius (Account takeover, data exfiltration, RCE)',
        '3. Primary Remediation (Parameterized query, CSP, server-side RBAC)',
        '4. Verification (Burp Suite repeater test, automated SAST/DAST rule)',
      ],
      sampleSnippet: '"SQLi occurs when user input is concatenated into query syntax. An attacker can dump password hashes or execute xp_cmdshell. The primary defense is prepared statements with parameterized inputs, verified using Burp Suite and SonarQube SAST rules."',
    },
  },

  networking: {
    domainId: 'networking',
    title: 'Network Security & Protocols',
    subtitle: 'TCP/IP, Firewalls, DNS, TLS Handshake & Packet Analysis',
    badge: 'Network Defense & Infrastructure',
    color: 'from-emerald-500 to-teal-600',
    coreFrameworks: [
      {
        name: 'OSI 7-Layer vs TCP/IP 4-Layer Model',
        description: 'Layer 7 (Application), Layer 4 (Transport/TCP/UDP), Layer 3 (Network/IP), Layer 2 (Data Link/MAC).',
        whenToQuote: 'Map attacks and defense controls to specific layers (e.g. SYN flood at Layer 4, HTTP flood at Layer 7).',
      },
      {
        name: 'Zero Trust Network Architecture (ZTNA)',
        description: 'Never trust, always verify; assume breach; micro-segmentation rather than flat VLANs.',
        whenToQuote: 'Contrast legacy perimeter defense (firewall/VPN) with modern identity-aware proxies.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'Walk me through the TCP 3-Way Handshake and how a SYN Flood attack exploits it.',
        keyPoints: [
          'Handshake: Client sends SYN -> Server responds SYN-ACK (allocates TCB in backlog queue) -> Client sends ACK',
          'Exploit: Attacker sends spoofed SYNs without sending final ACK; exhausts server TCP connection state table (backlog queue)',
          'Mitigation: SYN Cookies (delays memory allocation until valid ACK), rate limiting, Cloudflare/WAF scrubbing',
        ],
        whatInterviewersLookFor: 'Mentioning the Transmission Control Block (TCB) backlog queue and SYN Cookies.',
        practicePrompt: 'How do SYN Cookies mathematically prevent server state exhaustion during a DDoS attack?',
      },
      {
        question: 'What happens under the hood during a TLS 1.3 Handshake?',
        keyPoints: [
          'Round Trips: Reduced from 2 RTT (TLS 1.2) to 1 RTT (TLS 1.3)',
          'ClientHello: Sends supported cipher suites AND key share (Diffie-Hellman ephemeral)',
          'ServerHello: Chooses cipher and sends server DH key share + Certificate + Finished',
          'Forward Secrecy: Static RSA key exchange removed; only Ephemeral Diffie-Hellman (ECDHE) allowed',
        ],
        whatInterviewersLookFor: 'Understanding Perfect Forward Secrecy (PFS) and the 1-RTT latency improvement.',
        practicePrompt: 'Why did TLS 1.3 eliminate RSA key exchange in favor of Ephemeral Diffie-Hellman?',
      },
      {
        question: 'How do you detect DNS Tunneling and DNS Exfiltration in network traffic?',
        keyPoints: [
          'Concept: Encapsulating non-DNS protocols or sensitive data into subdomains of attacker-controlled nameservers',
          'Detection: Unusually long labels (>50 chars), high Shannon entropy in queries, high query volume to single apex domain, rare TXT/NULL record requests',
          'Defense: DNS Sinkholing, Response Policy Zones (RPZ), next-gen DNS filtering (Cisco Umbrella)',
        ],
        whatInterviewersLookFor: 'Mentioning Shannon entropy and query volume metrics in DNS logs.',
        practicePrompt: 'What statistical indicators in Zeek/Bro DNS logs indicate an active DNS exfiltration channel?',
      },
    ],
    powerTerminology: [
      {
        term: 'Micro-segmentation',
        definition: 'Dividing network zones into granular segments down to individual workload level to prevent lateral spread.',
        exampleUsage: '"We enforced micro-segmentation so database servers only accept ingress on 5432 from specific application pod IPs."',
      },
      {
        term: 'Stateful Inspection vs Stateless Packet Filtering',
        definition: 'Stateful firewalls track active connection states (SYN, ESTABLISHED) while stateless inspects packets in isolation.',
        exampleUsage: '"A stateful firewall automatically permits return traffic matching an established outbound connection entry."',
      },
      {
        term: 'ARP Spoofing / Poisoning',
        definition: 'Broadcasting fraudulent ARP replies to bind an attacker\'s MAC address with a default gateway\'s IP.',
        exampleUsage: '"We configured Dynamic ARP Inspection (DAI) and DHCP Snooping on core switches to block ARP spoofing."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Saying "HTTPS encrypts the destination IP address and port."',
        fix: 'HTTPS/TLS encrypts Layer 7 data. The IP address (Layer 3) and TCP port (Layer 4) remain plaintext in packet headers for routing.',
      },
      {
        blunder: 'Confusing TCP (connection-oriented, reliable, SYN/ACK) with UDP (connectionless, no handshake, best-effort).',
        fix: 'Always highlight TCP for stateful reliable data (SSH, HTTPS) and UDP for real-time traffic (DNS, VoIP, QUIC).',
      },
    ],
    deliveryFormulas: {
      name: 'The Protocol Analysis Formula',
      steps: [
        '1. State the Protocol Purpose & OSI Layer',
        '2. Diagram the Packet Exchange (SYN/ACK, ClientHello, DNS Query)',
        '3. Explain the Attack Vector (Spoofing, Exhaustion, Eavesdropping)',
        '4. Provide Enterprise Countermeasure (DAI, SYN Cookies, TLS 1.3, MTLS)',
      ],
      sampleSnippet: '"DNS operates at Layer 7 over UDP 53. Attackers use DNS tunneling by embedding Base64 in subdomains. We detect this by measuring Shannon entropy in Zeek logs and block it using DNS inspection with Response Policy Zones."',
    },
  },

  cloud_iam: {
    domainId: 'cloud_iam',
    title: 'Cloud Security & IAM',
    subtitle: 'AWS/GCP/Azure Hardening, Least Privilege, Zero Trust & Misconfigurations',
    badge: 'Cloud & Identity Architect',
    color: 'from-violet-500 to-purple-600',
    coreFrameworks: [
      {
        name: 'Shared Responsibility Model',
        description: 'Cloud provider secures the cloud (physical, hypervisor); Customer secures in the cloud (data, IAM, OS, configs).',
        whenToQuote: 'Whenever discussing cloud breach accountability or customer responsibility.',
      },
      {
        name: 'Principle of Least Privilege (PoLP)',
        description: 'Granting only the bare minimum permissions necessary to perform a specific task for the minimum duration.',
        whenToQuote: 'When reviewing IAM policies, wildcards (*:*), and role assumptions.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'What is the danger of granting "sts:AssumeRole" with overly permissive policies in AWS?',
        keyPoints: [
          'Risk: Privilege Escalation and cross-account lateral movement',
          'Vulnerability: Wildcard resource (Resource: "*") allows assuming higher-privilege administrative roles',
          'Defense: Explicit Trust Policy conditions (aws:PrincipalOrgID, external ID for 3rd parties), boundary policies',
        ],
        whatInterviewersLookFor: 'Understanding IAM Trust Policies vs Identity Policies, and Confused Deputy prevention.',
        practicePrompt: 'How does an external ID parameter in AWS IAM trust policies prevent the Confused Deputy problem?',
      },
      {
        question: 'How do you secure public-facing S3 buckets or Cloud Storage containers?',
        keyPoints: [
          'Enable "Block Public Access" at the AWS account root and bucket level',
          'Use IAM roles with least privilege rather than long-lived API access keys',
          'Enforce encryption in transit (aws:SecureTransport condition in bucket policy)',
          'Enable AWS Macie / GuardDuty for automated sensitive data discovery',
          'Enable S3 Object Versioning and MFA Delete for ransomware defense',
        ],
        whatInterviewersLookFor: 'Multi-layer defense: bucket policy + account-level block + encryption + audit logging (CloudTrail).',
        practicePrompt: 'Write a mental bucket policy condition that rejects any HTTP request lacking TLS encryption.',
      },
    ],
    powerTerminology: [
      {
        term: 'Cloud Security Posture Management (CSPM)',
        definition: 'Automated monitoring tool detecting cloud configuration drift, open ports, and IAM policy violations.',
        exampleUsage: '"Our CSPM flagged an EC2 instance with an instance profile attached allowing AdministratorAccess."',
      },
      {
        term: 'IMDSv2 (Instance Metadata Service Version 2)',
        definition: 'Session-oriented metadata service requiring a PUT token to prevent SSRF credential theft from cloud instances.',
        exampleUsage: '"We enforced IMDSv2 across all AWS launch templates to neutralize SSRF metadata token exfiltration."',
      },
      {
        term: 'Blast Radius in Cloud',
        definition: 'The maximum potential damage an attacker can inflict if an account or service role is compromised.',
        exampleUsage: '"We segmented workloads into dedicated AWS Organizations accounts to limit blast radius to a single VPC."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Using root AWS/GCP account for daily development or CI/CD pipelines.',
        fix: 'Root account credentials must have MFA hardware token locked in a vault, zero access keys, and alerts on any login.',
      },
      {
        blunder: 'Hardcoding static cloud credentials (AWS_ACCESS_KEY_ID) into container images or Git repos.',
        fix: 'Always advocate for short-lived IAM roles via OIDC (GitHub Actions OIDC), AWS Secrets Manager, or metadata service.',
      },
    ],
    deliveryFormulas: {
      name: 'The Cloud Defense Formula',
      steps: [
        '1. Identity First (Who is requesting? Service account, federated OIDC)',
        '2. Policy & Boundaries (Least privilege, permission boundaries, SCPs)',
        '3. Data Protection (KMS envelope encryption, private endpoints)',
        '4. Audit & Posture (CloudTrail, GuardDuty, CSPM continuous compliance)',
      ],
      sampleSnippet: '"In cloud, identity is the new perimeter. We eliminate static credentials using GitHub Actions OIDC to assume temporary roles. We enforce IMDSv2 to prevent SSRF exfiltration and audit configurations using AWS GuardDuty."',
    },
  },

  offensive_basics: {
    domainId: 'offensive_basics',
    title: 'Penetration Testing & Red Teaming',
    subtitle: 'Reconnaissance, Exploitation, Privilege Escalation & Reporting',
    badge: 'Ethical Hacking & Pentest',
    color: 'from-amber-500 to-orange-600',
    coreFrameworks: [
      {
        name: 'Cyber Kill Chain (Lockheed Martin)',
        description: 'Reconnaissance -> Weaponization -> Delivery -> Exploitation -> Installation -> Command & Control -> Actions on Objectives.',
        whenToQuote: 'Framing how an external penetration test advances toward domain compromise.',
      },
      {
        name: 'Rules of Engagement (RoE)',
        description: 'Documented scope, prohibited IP ranges, authorized testing windows, point-of-contact for crisis.',
        whenToQuote: 'First thing to mention before ever launching automated or manual penetration tools.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'What is the first thing you do before running an active scan or exploit against a client network?',
        keyPoints: [
          'Verify signed Scope & Rules of Engagement (RoE) and authorization letter (Get Out of Jail card)',
          'Confirm testing window and communication channels for emergency outages',
          'Verify target IP ranges are owned by client (not shared 3rd-party SaaS or ISP)',
          'Establish out-of-band communication with client Blue Team / CISO',
        ],
        whatInterviewersLookFor: 'Ethics, legal boundaries, and risk management. Running unauthorized tools is a criminal offense.',
        practicePrompt: 'If a client asks you to pentest their hosted cloud application, what permission do you need from their cloud provider?',
      },
      {
        question: 'Explain Kerberoasting and how an attacker uses it to obtain plaintext credentials.',
        keyPoints: [
          'Mechanism: Any valid domain user requests a Kerberos Ticket Granting Service (TGS) ticket for a Service Principal Name (SPN)',
          'Offline Crack: TGS ticket is encrypted with the service account\'s NTLM password hash; attacker extracts and cracks it offline using Hashcat',
          'Defense: Use Group Managed Service Accounts (gMSA) with 128-character randomized passwords; AES encryption instead of RC4',
        ],
        whatInterviewersLookFor: 'Knowing that Kerberoasting requires valid domain credentials and targets service accounts with SPNs.',
        practicePrompt: 'Why does Kerberoasting not generate failed logon alerts (Event ID 4625) in Active Directory?',
      },
    ],
    powerTerminology: [
      {
        term: 'Pivoting / Port Forwarding',
        definition: 'Using a compromised host as a jump-box or proxy to route traffic into an internal subnet inaccessible from the internet.',
        exampleUsage: '"After getting a shell on the DMZ web server, we pivoted into the internal 10.0.0.0/24 subnet using Chisel/SSH socks proxy."',
      },
      {
        term: 'Living off the Land (LotL)',
        definition: 'Using native operating system binaries (LOLBins like certutil, wmic, powershell) to evade AV/EDR signatures.',
        exampleUsage: '"Rather than uploading custom malware, the red team lived off the land using certutil.exe to download secondary payloads."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Glorifying "black hat" exploits or claiming you can hack anything with automated tools like Metasploit.',
        fix: 'Emphasize professional pentesting: understanding manual exploitation, risk impact to business operations, and actionable remediation reporting.',
      },
      {
        blunder: 'Delivering a vulnerability scan report (Nessus export) and calling it a penetration test.',
        fix: 'Explain that vulnerability scanning is automated discovery; penetration testing validates exploitability and chains weaknesses.',
      },
    ],
    deliveryFormulas: {
      name: 'The Pentest Finding Formula',
      steps: [
        '1. Finding Title & CVSS Score',
        '2. Vulnerable Asset & Root Cause',
        '3. Step-by-Step Proof-of-Concept (PoC)',
        '4. Business Impact Scenario',
        '5. Specific, prioritized remediation guidance',
      ],
      sampleSnippet: '"During the assessment we identified an Unauthenticated Blind SSRF (CVSS 8.6) in the webhook module. We demonstrated how an attacker can query AWS IMDSv1 to extract IAM session keys. We recommend enforcing IMDSv2 and a strict URL allowlist."',
    },
  },

  grc: {
    domainId: 'grc',
    title: 'Governance, Risk & Compliance',
    subtitle: 'NIST CSF, ISO 27001, SOC 2, Risk Assessment & Auditing',
    badge: 'Cyber Risk & Compliance',
    color: 'from-blue-500 to-indigo-600',
    coreFrameworks: [
      {
        name: 'NIST Cybersecurity Framework (CSF 2.0)',
        description: 'Govern, Identify, Protect, Detect, Respond, Recover.',
        whenToQuote: 'Standard framework for establishing enterprise security posture and maturity roadmap.',
      },
      {
        name: 'ISO/IEC 27001:2022',
        description: 'Information Security Management System (ISMS) standard with Annex A controls (Organizational, People, Physical, Tech).',
        whenToQuote: 'When discussing international compliance certifications and vendor risk assessments.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'What is the formula for calculating Qualitative vs Quantitative Risk?',
        keyPoints: [
          'Qualitative: Risk = Likelihood × Impact (Matrix: Low/Medium/High/Critical)',
          'Quantitative: Single Loss Expectancy (SLE) = Asset Value (AV) × Exposure Factor (EF); Annualized Loss Expectancy (ALE) = SLE × Annualized Rate of Occurrence (ARO)',
          'Value: Quantitative gives CFO/board dollar values to justify cybersecurity budget',
        ],
        whatInterviewersLookFor: 'Knowing the ALE = SLE × ARO formula and why boards prefer financial metrics.',
        practicePrompt: 'If an e-commerce server is worth $200k, an outage causes 50% loss, and happens twice a year, what is the ALE?',
      },
      {
        question: 'What are the 4 Risk Treatment Options?',
        keyPoints: [
          '1. Risk Mitigation (Implement controls e.g., MFA, EDR to lower likelihood/impact)',
          '2. Risk Avoidance (Discontinue the risky activity or eliminate the asset)',
          '3. Risk Transfer (Purchase cyber insurance, outsource to compliant cloud vendor)',
          '4. Risk Acceptance (Formal business sign-off when control cost exceeds potential loss)',
        ],
        whatInterviewersLookFor: 'Clear understanding that you cannot eliminate 100% of risk; residual risk must be formally accepted by leadership.',
        practicePrompt: 'When is it appropriate for an executive to accept a cybersecurity risk rather than remediate it?',
      },
    ],
    powerTerminology: [
      {
        term: 'Residual Risk vs Inherent Risk',
        definition: 'Inherent risk is the raw risk level before any controls; residual risk is what remains after controls are applied.',
        exampleUsage: '"Our inherent risk for ransomware was Critical; after rolling out offline backups and immutable snapshots, residual risk is Low."',
      },
      {
        term: 'SOC 2 Type 1 vs Type 2',
        definition: 'Type 1 audits control design at a point in time; Type 2 tests operating effectiveness over an evaluation period (usually 6-12 months).',
        exampleUsage: '"Enterprise customers require a SOC 2 Type 2 report to verify our access review controls functioned consistently all year."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Believing that "Compliance equals Security."',
        fix: 'State clearly that compliance is a baseline floor, not a ceiling. An organization can be 100% compliant with PCI-DSS and still suffer a breach.',
      },
    ],
    deliveryFormulas: {
      name: 'The Boardroom Risk Pitch Formula',
      steps: [
        '1. Frame the business risk (revenue, reputational, regulatory fines)',
        '2. State current gap (Inherent risk & compliance mandate)',
        '3. Propose control with cost-benefit ROI (ALE reduction)',
        '4. Provide clear timeline and metric for success',
      ],
      sampleSnippet: '"Unmanaged vendor access exposes us to supply-chain ransomware which could halt production with an estimated ALE of $1.2M. By implementing third-party PAM with automated session recording for $40k/yr, we reduce residual risk to Low and achieve ISO 27001 Annex A.15 compliance."',
    },
  },

  cybersecurity_fundamentals: {
    domainId: 'cybersecurity_fundamentals',
    title: 'Cybersecurity Fundamentals',
    subtitle: 'CIA Triad, Cryptography, Authentication & Defense-in-Depth',
    badge: 'Core Cybersecurity Knowledge',
    color: 'from-cyan-500 to-teal-500',
    coreFrameworks: [
      {
        name: 'The CIA Triad',
        description: 'Confidentiality (Encryption, ACLs), Integrity (Hashing, Digital Signatures), Availability (Redundancy, Backups, DDoS mitigation).',
        whenToQuote: 'Ground every security decision in which pillar of the triad it safeguards.',
      },
      {
        name: 'Defense-in-Depth',
        description: 'Layered security controls ensuring the failure of one defensive layer does not lead to total system compromise.',
        whenToQuote: 'When explaining why firewalls alone are never sufficient without host and data controls.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'Explain the difference between Hashing, Symmetric Encryption, and Asymmetric Encryption.',
        keyPoints: [
          'Hashing: One-way mathematical function (SHA-256) for integrity verification; cannot be decrypted',
          'Symmetric: Single shared key for both encryption and decryption (AES-256); fast, ideal for bulk data in transit/at rest',
          'Asymmetric: Public/Private keypair (RSA, ECC); public encrypts / private decrypts; used for key exchange (TLS) and digital signatures',
        ],
        whatInterviewersLookFor: 'Never say "decrypting a hash"; understanding that salting hashes prevents rainbow table lookups.',
        practicePrompt: 'Why is SHA-256 without salt dangerous for storing user passwords, and what algorithms should be used instead (bcrypt/Argon2)?',
      },
      {
        question: 'What are the 3 classic Authentication Factors in MFA?',
        keyPoints: [
          '1. Something you know (Password, PIN)',
          '2. Something you have (FIDO2 WebAuthn hardware key, Authenticator TOTP app, Smart card)',
          '3. Something you are (Biometrics: Fingerprint, Facial recognition, Retina)',
          'Bonus: Somewhere you are (Geolocation), Something you do (Keystroke dynamics)',
          'Notice: SMS OTP is weak due to SIM swapping and SS7 interception; push for FIDO2/FIDO Alliance WebAuthn',
        ],
        whatInterviewersLookFor: 'Distinguishing true multifactor (combining two different categories) vs two of the same factor (two passwords).',
        practicePrompt: 'Why does requiring a password and a security question (Mother\'s maiden name) NOT count as true Multi-Factor Authentication?',
      },
    ],
    powerTerminology: [
      {
        term: 'Non-Repudiation',
        definition: 'Assurance that the author or sender cannot deny having sent a message or initiated an action (achieved via digital signatures).',
        exampleUsage: '"By using private-key digital signatures, we ensure non-repudiation on all financial wire approval transactions."',
      },
      {
        term: 'Defense-in-Depth',
        definition: 'An architectural strategy utilizing multiple defensive layers (perimeter, network, host, application, data).',
        exampleUsage: '"If an attacker bypasses our WAF, our defense-in-depth ensures container isolation and DB least privilege prevent exfiltration."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Saying you "decrypt" an MD5 or SHA-256 hash.',
        fix: 'Hashes are one-way. You compare hashes or reverse via rainbow tables/brute-force; you do not decrypt them.',
      },
      {
        blunder: 'Suggesting rolling your own encryption algorithm.',
        fix: 'Never write custom cryptography! Always use battle-tested, peer-reviewed primitives and libraries (NIST approved AES, ECDSA).',
      },
    ],
    deliveryFormulas: {
      name: 'The Fundamentals Definition Formula',
      steps: [
        '1. Exact definition and core purpose',
        '2. Concrete enterprise example',
        '3. Contrast with related concepts (e.g. hashing vs encryption)',
        '4. Real-world defensive recommendation',
      ],
      sampleSnippet: '"Confidentiality prevents unauthorized reading of data via AES-256 encryption. Unlike hashing which is one-way for integrity, encryption allows authorized holders of the private key to decrypt. In our architecture, we enforce AES-256-GCM at rest and TLS 1.3 in transit."',
    },
  },

  fundamentals: {
    domainId: 'fundamentals',
    title: 'General Cybersecurity Foundations',
    subtitle: 'Security Principles, Common Attacks, Operating System Internals',
    badge: 'Core Cybersecurity Knowledge',
    color: 'from-cyan-500 to-teal-500',
    coreFrameworks: [
      {
        name: 'The CIA Triad',
        description: 'Confidentiality, Integrity, Availability.',
        whenToQuote: 'Ground every security decision in which pillar of the triad it safeguards.',
      },
    ],
    highYieldQuestions: [
      {
        question: 'What is a Man-in-the-Middle (MitM) attack and how is it prevented in modern networks?',
        keyPoints: [
          'Mechanism: Attacker intercepts communication between two parties secretly relaying and altering messages',
          'Methods: ARP spoofing, rogue Wi-Fi access points, DNS spoofing',
          'Prevention: End-to-end TLS encryption with Certificate Pinning, strict HSTS headers, Dynamic ARP Inspection',
        ],
        whatInterviewersLookFor: 'Explaining how digital certificates and public key infrastructure (PKI) authenticate the remote server.',
        practicePrompt: 'How does HSTS (HTTP Strict Transport Security) protect users against SSL stripping attacks in MitM scenarios?',
      },
    ],
    powerTerminology: [
      {
        term: 'Attack Surface',
        definition: 'The sum of all possible entry points where an unauthorized user can try to enter or extract data.',
        exampleUsage: '"We reduced the server attack surface by disabling unused ports, removing unnecessary daemons, and hardening SSH."',
      },
    ],
    redFlagsToAvoid: [
      {
        blunder: 'Claiming that an antivirus or firewall makes a system 100% secure.',
        fix: 'Emphasize that security is continuous risk management; no single tool guarantees total immunity against zero-days.',
      },
    ],
    deliveryFormulas: {
      name: 'The General Tech Answer Formula',
      steps: [
        '1. Clear 1-sentence definition',
        '2. How the attack works step-by-step',
        '3. How defenders detect and mitigate it',
      ],
      sampleSnippet: '"A buffer overflow occurs when a program writes more data to a buffer than its allocated memory boundary. In modern systems, this is mitigated by ASLR (Address Space Layout Randomization) and non-executable stack flags (DEP/NX)."',
    },
  },
};
