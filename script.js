document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const ui = {
      fileInput: document.getElementById('file'),
      resumeText: document.getElementById('resume'),
      jobText: document.getElementById('job'),
      analyzeBtn: document.getElementById('analyze'),
      loading: document.getElementById('loading'),
      results: document.getElementById('results'),
      structureDiv: document.getElementById('structure'),
      grammarDiv: document.getElementById('grammar'),
      jobmatchDiv: document.getElementById('jobmatch'),
      verdictDiv: document.getElementById('verdict')
    };
    
    // Required resume sections
    const requiredSections = [
      'Name', 'Phone', 'Email', 'Links', 'PROFESSIONAL SUMMARY', 'EDUCATION',
      'PROJECTS', 'CERTIFICATIONS', 'SKILLS', 'Computer Languages',
      'Software Packages', 'Co-curricular & POR'
    ];
    
    // Section regex patterns for detection
    const sectionPatterns = [
      { name: 'header', regex: /^.*?(Phone|Email|LinkedIn)/i },
      { name: 'summary', regex: /\b(PROFESSIONAL\s+SUMMARY|SUMMARY|PROFILE|OBJECTIVE)\b/i },
      { name: 'education', regex: /\b(EDUCATION|ACADEMIC|QUALIFICATION|UNIVERSITY|COLLEGE|BACHELOR|MASTER|PHD|B\.TECH|M\.TECH)\b/i },
      { name: 'projects', regex: /\b(PROJECTS|PROJECT EXPERIENCE|PROJECT WORK)\b/i },
      { name: 'experience', regex: /\b(EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|WORK HISTORY)\b/i },
      { name: 'certifications', regex: /\b(CERTIFICATION|CERTIFICATIONS|CERTIFICATES|ACCREDITATION)\b/i },
      { name: 'skills', regex: /\b(SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES)\b/i },
      { name: 'languages', regex: /\b(COMPUTER LANGUAGES|PROGRAMMING LANGUAGES|LANGUAGES|TECH STACK)\b/i },
      { name: 'software', regex: /\b(SOFTWARE|SOFTWARE PACKAGES|TOOLS|TECHNOLOGIES|PLATFORMS|FRAMEWORKS)\b/i },
      { name: 'activities', regex: /\b(CO-CURRICULAR|EXTRACURRICULAR|ACTIVITIES|ACHIEVEMENTS|POSITIONS OF RESPONSIBILITY|POR)\b/i }
    ];
    
    // File handlers
    ui.fileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      if (file.type === 'application/pdf') {
        extractPdfText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) ui.resumeText.value = e.target.result;
        };
        reader.readAsText(file);
      }
    });
    
    // Extract text from PDF
    function extractPdfText(file) {
      ui.loading.classList.remove('d-none');
      const fileReader = new FileReader();
      
      fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
          let textContent = '';
          const maxPages = pdf.numPages;
          let currentPage = 1;
          
          function extractPageText() {
            pdf.getPage(currentPage).then(function(page) {
              page.getTextContent().then(function(content) {
                textContent += content.items.map(item => item.str).join(' ') + '\n';
                currentPage++;
                if (currentPage <= maxPages) {
                  extractPageText();
                } else {
                  ui.resumeText.value = textContent;
                  ui.loading.classList.add('d-none');
                }
              });
            });
          }
          
          extractPageText();
        }).catch(function(error) {
          console.error('Error loading PDF:', error);
          alert('Failed to extract text from PDF. Please try another file or paste text directly.');
          ui.loading.classList.add('d-none');
        });
      };
      
      fileReader.readAsArrayBuffer(file);
    }
    
    // Parse resume to identify sections
    function parseResume(text) {
      const sections = {};
      sectionPatterns.forEach(p => sections[p.name] = []);
      
      let lines = text.split(/\n+/);
      if (lines.length < 5) lines = text.split(/(?:\s{2,}|\n+|•+|⋅+)/);
      lines = lines.filter(line => line.trim().length > 0);
      
      // Process header first
      let headerEnd = 0;
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].trim();
        if (/(Phone|Email|LinkedIn|Github|Contact)/i.test(line)) {
          sections.header.push(line);
          headerEnd = i;
        } else if (sections.header.length > 0 && i <= headerEnd + 2) {
          sections.header.push(line);
        } else if (/(PROFESSIONAL\s+SUMMARY|SUMMARY|PROFILE|OBJECTIVE)/i.test(line)) {
          break;
        }
      }
      
      // Process remaining content
      let currentSection = 'header';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        let foundNewSection = false;
        for (const pattern of sectionPatterns) {
          if (pattern.regex.test(line)) {
            currentSection = pattern.name;
            if (!sections[currentSection].includes(line)) {
              sections[currentSection].push(line);
            }
            foundNewSection = true;
            break;
          }
        }
        
        if (!foundNewSection && i > headerEnd) {
          sections[currentSection].push(line);
        }
      }
      
      // Extract skills if missing
      if (sections.skills.length <= 1) {
        for (const line of lines) {
          if (/(\w+\s*[,•|&])+\s*\w+/i.test(line) && 
              /\b(java|python|javascript|react|node|html|css|c\+\+|sql|git|docker)\b/i.test(line)) {
            sections.skills.push(line);
          }
        }
      }
      
      // Extract languages and software if missing
      const allText = lines.join(' ');
      if (sections.languages.length <= 1) {
        const langs = [...allText.matchAll(/(java\s*script|python|java|c\+\+|c#|ruby|typescript|php|swift|kotlin|go|rust|scala|perl)/gi)]
          .map(match => match[0]);
        if (langs.length) sections.languages.push('Computer Languages: ' + langs.join(', '));
      }
      
      if (sections.software.length <= 1) {
        const software = [...allText.matchAll(/(react|angular|vue|node|express|django|flask|spring|laravel|wordpress|mongodb|mysql|postgresql|firebase|aws|azure|docker|kubernetes)/gi)]
          .map(match => match[0]);
        if (software.length) sections.software.push('Software Packages: ' + software.join(', '));
      }
      
      return sections;
    }
    
    // Check resume structure
    function checkStructure(text) {
      const sections = parseResume(text);
      const results = [];
      
      // Map parsed sections to required sections
      const sectionMapping = {
        'summary': 'PROFESSIONAL SUMMARY',
        'education': 'EDUCATION',
        'projects': 'PROJECTS',
        'experience': 'EXPERIENCE',
        'certifications': 'CERTIFICATIONS',
        'skills': 'SKILLS',
        'languages': 'Computer Languages',
        'software': 'Software Packages',
        'activities': 'Co-curricular & POR'
      };
      
      // Check personal info
      const firstLine = text.split('\n')[0];
      results.push({ section: 'Name', exists: /^\s*([A-Z][a-z]+\s+([A-Z]\.?\s+)?[A-Z][a-z]+)/.test(firstLine) });
      results.push({ section: 'Phone', exists: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) });
      results.push({ section: 'Email', exists: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text) });
      results.push({ section: 'Links', exists: /(LinkedIn|Github|HackerRank|CodeChef|Codeforces|LeetCode|Portfolio|Website)/i.test(text) });
      
      // Check all other sections
      for (const [key, section] of Object.entries(sectionMapping)) {
        results.push({ section, exists: sections[key] && sections[key].length > 0 });
      }
      
      // Calculate score (weighted)
      const essentialSections = ['Name', 'Email', 'PROFESSIONAL SUMMARY', 'EDUCATION', 'SKILLS'];
      let essentialCount = 0, otherCount = 0;
      
      for (const result of results) {
        if (essentialSections.includes(result.section)) {
          if (result.exists) essentialCount++;
        } else if (result.exists) {
          otherCount++;
        }
      }
      
      const score = ((essentialCount / essentialSections.length) * 0.7 + 
                     (otherCount / (results.length - essentialSections.length)) * 0.3) * 100;
      
      return { items: results, score, sections };
    }
    
    // Check grammar
    async function checkGrammar(sections) {
      try {
        // Extract text from relevant sections
        const sectionsToCheck = ['summary', 'projects', 'education'];
        const textToCheck = sectionsToCheck.reduce((text, section) => {
          if (sections[section] && sections[section].length) {
            return text + sections[section].join(' ') + ' ';
          }
          return text;
        }, '').trim();
        
        if (!textToCheck) return { issues: [], score: 100 };
        
        const response = await fetch('https://api.languagetool.org/v2/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            'text': textToCheck,
            'language': 'en-US',
            'disabledRules': 'WHITESPACE_RULE,UPPERCASE_SENTENCE_START'
          })
        });
        
        const data = await response.json();
        return {
          issues: data.matches || [],
          score: data.matches ? Math.max(0, 100 - (data.matches.length * 5)) : 100
        };
      } catch (error) {
        console.error('Error checking grammar:', error);
        return { issues: [], score: 50 };
      }
    }
    
    // Check job match
    function checkJobMatch(resumeText, jobText) {
      if (!jobText) return { matches: [], score: 0 };
      
      const commonWords = ['and', 'the', 'for', 'with', 'that', 'have', 'this', 'are', 'from', 
        'your', 'will', 'you', 'our', 'who', 'should', 'must', 'can', 'able', 'they', 'them'];
      
      const jobWords = [...new Set(jobText.toLowerCase()
        .split(/[,.\s()\[\]]+/)
        .filter(word => word.length > 3 && !commonWords.includes(word)))];
      
      const resumeLower = resumeText.toLowerCase();
      const matches = jobWords.map(word => ({
        keyword: word,
        exists: resumeLower.includes(word)
      }));
      
      const matchCount = matches.filter(m => m.exists).length;
      const score = jobWords.length ? (matchCount / jobWords.length) * 100 : 0;
      
      return { matches, score };
    }
    
    // Create UI for structure analysis
    function showStructure(result) {
      ui.structureDiv.innerHTML = `
        <div class="score-box">
          <div class="score-name">Structure Score:</div>
          <div class="progress w-100">
            <div class="progress-bar bar-structure" role="progressbar" 
                 style="width: ${result.score}%" aria-valuenow="${result.score}">
              ${Math.round(result.score)}%
            </div>
          </div>
        </div>
        <div>${result.items.map(item => `
          <div class="section-item ${item.exists ? 'has-section' : 'missing-section'}">
            <i class="fas fa-${item.exists ? 'check' : 'times'}-circle me-2"></i>
            <span class="section-name">${item.section}</span>: 
            ${item.exists ? 'Present' : 'Missing'}
          </div>`).join('')}
        </div>
      `;
    }
    
    // Create UI for grammar analysis
    function showGrammar(result) {
      if (result.issues.length === 0) {
        ui.grammarDiv.innerHTML = `
          <div class="score-box">
            <div class="score-name">Grammar Score:</div>
            <div class="progress w-100">
              <div class="progress-bar bar-grammar" role="progressbar" 
                   style="width: ${result.score}%" aria-valuenow="${result.score}">
                ${Math.round(result.score)}%
              </div>
            </div>
          </div>
          <div class="alert alert-success mt-3">No grammar issues found!</div>
        `;
        return;
      }
      
      const issues = result.issues.slice(0, 5).map((issue, i) => {
        const context = issue.context.text;
        const errorStart = issue.context.offset;
        const errorEnd = errorStart + issue.context.length;
        
        return `
          <div class="grammar-error">
            <h6>Issue #${i+1}: ${issue.rule.description || 'Grammar issue'}</h6>
            <p>${context.substring(0, errorStart)}
              <span class="highlight">${context.substring(errorStart, errorEnd)}</span>
              ${context.substring(errorEnd)}
            </p>
            ${issue.replacements && issue.replacements.length ? 
              `<p class="text-success"><strong>Suggestion:</strong> "${issue.replacements[0].value}"</p>` : ''}
          </div>
        `;
      }).join('');
      
      ui.grammarDiv.innerHTML = `
        <div class="score-box">
          <div class="score-name">Grammar Score:</div>
          <div class="progress w-100">
            <div class="progress-bar bar-grammar" role="progressbar" 
                 style="width: ${result.score}%" aria-valuenow="${result.score}">
              ${Math.round(result.score)}%
            </div>
          </div>
        </div>
        <div class="alert alert-info mt-2 mb-3">
          <small><i class="fas fa-info-circle me-1"></i> Grammar check only analyzes summary, education, and project descriptions.</small>
        </div>
        ${issues}
        ${result.issues.length > 5 ? 
          `<div class="alert alert-warning mt-3">${result.issues.length - 5} more issues found but not displayed.</div>` : ''}
      `;
    }
    
    // Create UI for job match analysis
    function showJobMatch(result) {
      if (result.matches.length === 0) {
        ui.jobmatchDiv.innerHTML = `
          <div class="score-box">
            <div class="score-name">Job Match Score:</div>
            <div class="progress w-100">
              <div class="progress-bar bar-jobmatch" role="progressbar" 
                   style="width: 0%" aria-valuenow="0">0%</div>
            </div>
          </div>
          <div class="alert alert-warning">No job description provided or no significant keywords found.</div>
        `;
        return;
      }
      
      // Sort and filter matches
      const sortedMatches = [...result.matches].sort((a, b) => 
        b.keyword.length !== a.keyword.length ? b.keyword.length - a.keyword.length : b.exists - a.exists);
      
      const matches = sortedMatches.filter(m => m.exists).slice(0, 6).map(match => `
        <div class="job-item job-match">
          <i class="fas fa-check-circle me-2"></i> <strong>${match.keyword}</strong>
        </div>
      `).join('');
      
      const misses = sortedMatches.filter(m => !m.exists).slice(0, 6).map(match => `
        <div class="job-item job-missing">
          <i class="fas fa-times-circle me-2"></i> <strong>${match.keyword}</strong>
        </div>
      `).join('');
      
      ui.jobmatchDiv.innerHTML = `
        <div class="score-box">
          <div class="score-name">Job Match Score:</div>
          <div class="progress w-100">
            <div class="progress-bar bar-jobmatch" role="progressbar" 
                 style="width: ${result.score}%" aria-valuenow="${result.score}">
              ${Math.round(result.score)}%
            </div>
          </div>
        </div>
        <h6 class="mt-3">Key Job Requirements Found:</h6>
        ${matches || '<div class="alert alert-warning mt-2">No matching keywords found!</div>'}
        <h6 class="mt-4">Missing Job Requirements:</h6>
        ${misses || '<div class="alert alert-success mt-2">Your resume covers all job requirements!</div>'}
      `;
    }
    
    // Create final verdict UI
    function showVerdict(structureScore, grammarScore, jobMatchScore) {
      const overallScore = (structureScore * 0.4 + grammarScore * 0.2 + jobMatchScore * 0.4);
      
      let verdict, suggestionsList = '';
      if (overallScore >= 70) {
        verdict = `
          <div class="verdict-pass">
            <h4><i class="fas fa-check-circle me-2"></i>Resume Shortlisted!</h4>
            <p class="mb-0">Congratulations! Your resume meets the requirements and follows best practices.</p>
          </div>
        `;
      } else {
        if (structureScore < 70) suggestionsList += '<li>Add the missing sections to match the required resume structure.</li>';
        if (grammarScore < 70) suggestionsList += '<li>Fix the grammar issues in your professional summary and project descriptions.</li>';
        if (jobMatchScore < 70) suggestionsList += '<li>Add more keywords from the job description to better match the requirements.</li>';
        
        verdict = `
          <div class="verdict-fail">
            <h4><i class="fas fa-exclamation-triangle me-2"></i>Needs Improvement</h4>
            <p>Your resume needs improvement before it can be shortlisted.</p>
            <ul>${suggestionsList}</ul>
          </div>
        `;
      }
      
      ui.verdictDiv.innerHTML = `
        <div class="card-header">
          <h5 class="mb-0"><i class="fas fa-gavel me-2"></i>Final Verdict</h5>
        </div>
        <div class="card-body">
          <div class="score-box">
            <div class="score-name">Overall Score:</div>
            <div class="progress w-100">
              <div class="progress-bar bar-overall" role="progressbar" 
                  style="width: ${overallScore}%" aria-valuenow="${overallScore}">
                ${Math.round(overallScore)}%
              </div>
            </div>
          </div>
          ${verdict}
        </div>
      `;
    }
    
    // Main analyze function
    async function analyzeResume() {
      const text = ui.resumeText.value.trim();
      const jobDesc = ui.jobText.value.trim();
      
      if (!text) {
        alert('Please upload or paste a resume');
        return;
      }
      
      ui.loading.classList.remove('d-none');
      ui.analyzeBtn.disabled = true;
      ui.results.classList.add('d-none');
      
      try {
        // Run analysis
        const structureResult = checkStructure(text);
        const grammarResult = await checkGrammar(structureResult.sections);
        const jobMatchResult = checkJobMatch(text, jobDesc);
        
        // Display results
        showStructure(structureResult);
        showGrammar(grammarResult);
        showJobMatch(jobMatchResult);
        showVerdict(structureResult.score, grammarResult.score, jobMatchResult.score);
        
        ui.results.classList.remove('d-none');
        ui.results.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error processing resume:', error);
        alert('Error processing resume. Please try again.');
      } finally {
        ui.loading.classList.add('d-none');
        ui.analyzeBtn.disabled = false;
      }
    }
    
    // Initialize event handlers
    ui.analyzeBtn.addEventListener('click', analyzeResume);
  });