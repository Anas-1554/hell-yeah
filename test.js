/**
 * Form Testing Script for N8N Integration
 * 
 * Usage:
 * 1. Open your form in the browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this script
 * 4. Run: testForm('full') or testForm('partial') or testForm('minimal')
 */

class FormTester {
  constructor() {
    this.testData = {
      // Sample data for different question types
      text: [
        'Acme Corporation', 'Tech Innovations Inc', 'Global Solutions LLC',
        'John Smith', 'Sarah Johnson', 'Michael Chen', 'Emma Davis',
        'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Austin, TX',
        'https://example.com', 'https://mycompany.com', 'https://business.co'
      ],
      
      email: [
        'john@example.com', 'sarah@company.com', 'info@business.co',
        'contact@acme.com', 'hello@startup.io'
      ],
      
      phone: [
        '+1 (555) 123-4567', '555-987-6543', '(123) 456-7890',
        '+1-555-111-2222', '555.333.4444'
      ],
      
      textarea: [
        'We are a growing company focused on innovation and customer satisfaction. Our main challenges include scaling our operations and improving our digital presence.',
        'Our target audience consists of young professionals aged 25-40 who value quality and convenience. We want to establish ourselves as a trusted brand in our industry.',
        'We specialize in providing high-quality solutions to small and medium businesses. Our biggest competitors include established players in the market.',
        'Looking to expand our reach and improve our content strategy. We need help with social media presence and brand positioning.'
      ],
      
      number: [5, 10, 15, 25, 50, 100],
      
      // Radio button options based on your form
      radio: {
        'founder_on_camera': ['yes', 'no', 'sometimes'],
        'compliance_review': ['yes', 'no'],
        'brand_kit': ['yes', 'no', 'need_help'],
        'timeline_to_start': ['right_now', 'within_30_days', 'just_exploring'],
        'paid_ads_activity': ['just_getting_started', 'simple_campaigns', 'scaling_testing'],
        'management_style': ['minimal_async', 'weekly_updates', 'full_oversight'],
        'brand_strategy_help': ['defining_voice', 'aligning_tone', 'positioning_guide', 'solid_strategy'],
        'content_strategy_help': ['content_calendars', 'hook_testing', 'platform_trends', 'syndication_strategy', 'not_needed'],
        // Pricing tiers
        'videographer_pricing': ['entry', 'mid', 'premium'],
        'video_editing_pricing': ['basic', 'advanced'],
        'copywriter_pricing': ['basic', 'advanced'],
        'content_strategist_pricing': ['basic', 'advanced'],
        'brand_strategist_pricing': ['basic', 'advanced'],
        'graphic_designer_pricing': ['basic', 'advanced'],
        'ugc_manager_pricing': ['basic', 'advanced'],
        'influencer_manager_pricing': ['basic', 'advanced'],
        'paid_ads_specialist_pricing': ['basic', 'advanced'],
        'account_manager_pricing': ['basic', 'advanced'],
        'video_content_volume_both': ['4_6_videos', '8_10_videos', '12_plus_videos', 'full_system'],
        'filming_frequency': ['one_per_month', 'two_per_month', 'weekly', 'only_ugc']
      },
      
      // Checkbox options
      checkbox: {
        'goals': ['increase_followers', 'generate_leads', 'boost_content', 'launch_ugc', 'improve_creative_strategy'],
        'grow_presence': ['instagram', 'tiktok', 'youtube', 'linkedin', 'facebook'],
        'content_formats': ['tutorials', 'testimonials', 'founder_videos', 'lifestyle_ugc', 'influencer_videos'],
        'zigzy_services': ['videographer', 'video_editing', 'copywriter', 'content_strategist', 'brand_strategist'],
        'copy_formats_needed': ['social_captions', 'video_scripts', 'paid_ad_copy', 'email_newsletter']
      },
      
      // Contact options
      contact: ['email', 'phone']
    };
    
    // Required questions that must always be filled
    this.requiredQuestions = [
      'brand_name', 'your_name', 'contact_info'
    ];
  }

  /**
   * Get a random item from an array
   */
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Get multiple random items from an array
   */
  getRandomItems(array, count = null) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    const itemCount = count || Math.floor(Math.random() * array.length) + 1;
    return shuffled.slice(0, Math.min(itemCount, array.length));
  }

  /**
   * Simulate typing in an input field
   */
  async simulateTyping(element, text, fast = false) {
    // Focus the element and clear its value
    element.focus();
    element.value = '';
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Determine typing speed
    const delay = fast ? 10 : 50;
    
    // Type each character with a delay
    for (let char of text) {
      element.value += char;
      
      // Dispatch both input and keydown/keyup events for better React compatibility
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Create and dispatch keydown event
      const keydownEvent = new KeyboardEvent('keydown', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      });
      element.dispatchEvent(keydownEvent);
      
      // Create and dispatch keyup event
      const keyupEvent = new KeyboardEvent('keyup', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      });
      element.dispatchEvent(keyupEvent);
      
      await this.sleep(delay);
    }
    
    // Dispatch change event when typing is complete
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Dispatch blur event to simulate user moving away from field
    await this.sleep(100);
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Click an element with animation
   */
  async clickElement(element) {
    // Scroll the element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.sleep(300);
    
    // Highlight the element briefly to show what's being clicked
    const originalBackground = element.style.backgroundColor;
    const originalTransition = element.style.transition;
    element.style.transition = 'background-color 0.2s';
    element.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
    await this.sleep(200);
    
    // Simulate mousedown, mouseup, and click events for better React compatibility
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await this.sleep(50);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.click(); // Native click
    element.dispatchEvent(new MouseEvent('click', { bubbles: true })); // Explicit click event
    
    // Reset the element's style
    await this.sleep(100);
    element.style.backgroundColor = originalBackground;
    element.style.transition = originalTransition;
    
    // Wait for any animations or state changes to complete
    await this.sleep(300);
  }

  /**
   * Fill a text input
   */
  async fillTextInput(questionId, mode) {
    // Find all visible inputs and textareas
    const inputs = document.querySelectorAll(`input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea`);
    
    // Filter to find visible inputs
    const visibleInputs = Array.from(inputs).filter(input => {
      const style = window.getComputedStyle(input);
      const rect = input.getBoundingClientRect();
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             rect.width > 0 && rect.height > 0;
    });
    
    // Use the first visible input
    const input = visibleInputs[0];
    
    if (!input) {
      console.log('⚠️ No visible input field found');
      return false;
    }

    let value = '';
    
    if (questionId.includes('email') || questionId === 'contact_info') {
      value = this.getRandomItem(this.testData.email);
    } else if (questionId.includes('phone')) {
      value = this.getRandomItem(this.testData.phone);
    } else if (questionId.includes('number') || input.type === 'number') {
      value = this.getRandomItem(this.testData.number).toString();
    } else if (input.tagName.toLowerCase() === 'textarea') {
      value = this.getRandomItem(this.testData.textarea);
    } else {
      value = this.getRandomItem(this.testData.text);
    }

    console.log(`📝 Filling ${questionId} with: ${value}`);
    await this.simulateTyping(input, value, mode === 'fast');
    return true;
  }

  /**
   * Fill radio button question
   */
  async fillRadioQuestion(questionId) {
    const radioButtons = document.querySelectorAll('button[role="radio"], input[type="radio"]');
    
    if (radioButtons.length === 0) return false;

    // Filter out disabled buttons
    const enabledButtons = Array.from(radioButtons).filter(btn => !btn.disabled);
    if (enabledButtons.length === 0) {
      console.log('⚠️ No enabled radio buttons found');
      return false;
    }

    const options = this.testData.radio[questionId];
    if (options) {
      // Find button with matching text
      for (let button of enabledButtons) {
        const buttonText = button.textContent.toLowerCase().trim();
        const targetOption = this.getRandomItem(options);
        
        if (buttonText.includes(targetOption.replace('_', ' '))) {
          console.log(`🔘 Selecting radio option for ${questionId}: ${targetOption} (${buttonText})`);
          await this.clickElement(button);
          return true;
        }
      }
    }
    
    // Fallback: click random available option
    const randomButton = this.getRandomItem(enabledButtons);
    console.log(`🔘 Selecting random radio option for ${questionId}: ${randomButton.textContent.trim()}`);
    await this.clickElement(randomButton);
    return true;
  }

  /**
   * Fill checkbox question
   */
  async fillCheckboxQuestion(questionId, mode) {
    const checkboxes = document.querySelectorAll('button[role="checkbox"], input[type="checkbox"]');
    
    if (checkboxes.length === 0) return false;

    // Filter out disabled buttons and contact method buttons
    const enabledCheckboxes = Array.from(checkboxes).filter(btn => {
      const btnText = btn.textContent.toLowerCase();
      return !btn.disabled && 
             !btnText.includes('email') && 
             !btnText.includes('phone');
    });

    if (enabledCheckboxes.length === 0) {
      console.log('⚠️ No enabled checkbox options found');
      return false;
    }

    const options = this.testData.checkbox[questionId];
    let selectCount = 1;
    
    if (mode === 'full') {
      selectCount = Math.min(enabledCheckboxes.length, options ? options.length : 3);
    } else if (mode === 'partial') {
      selectCount = Math.floor(Math.random() * Math.min(enabledCheckboxes.length, 3)) + 1;
    }

    console.log(`☑️ Selecting ${selectCount} checkbox options for ${questionId}`);
    
    // Randomly select checkboxes instead of always selecting the first ones
    const shuffledCheckboxes = [...enabledCheckboxes].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < selectCount && i < shuffledCheckboxes.length; i++) {
      const checkbox = shuffledCheckboxes[i];
      console.log(`   ✓ Selecting: ${checkbox.textContent.trim()}`);
      await this.clickElement(checkbox);
      await this.sleep(300);
    }
    
    return true;
  }

  /**
   * Fill contact question
   */
  async fillContactQuestion() {
    // First select contact methods
    const methodButtons = document.querySelectorAll('button[role="checkbox"]');
    
    if (methodButtons.length > 0) {
      console.log('📞 Selecting contact methods');
      
      // Select email and phone
      for (let button of methodButtons) {
        if (button.textContent.toLowerCase().includes('email') || 
            button.textContent.toLowerCase().includes('phone')) {
          await this.clickElement(button);
          await this.sleep(500); // Wait for fields to appear
        }
      }
      
      // Fill email field if visible
      await this.sleep(1000);
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        await this.simulateTyping(emailInput, this.getRandomItem(this.testData.email));
      }
      
      // Fill phone field if visible
      const phoneInput = document.querySelector('input[type="tel"]');
      if (phoneInput) {
        await this.simulateTyping(phoneInput, this.getRandomItem(this.testData.phone));
      }
    }
    
    return true;
  }

  /**
   * Fill current question based on its type
   */
  async fillCurrentQuestion(mode) {
    await this.sleep(1000); // Wait longer for question to load and animations to complete
    
    // Get question title to identify type
    const questionTitle = document.querySelector('h1');
    const questionText = questionTitle ? questionTitle.textContent.toLowerCase() : '';
    
    // Extract question ID from title or use heuristics
    let questionId = 'unknown';
    if (questionText.includes('brand') && questionText.includes('name')) {
      questionId = 'brand_name';
    } else if (questionText.includes('your name')) {
      questionId = 'your_name';
    } else if (questionText.includes('contact')) {
      questionId = 'contact_info';
    } else if (questionText.includes('website')) {
      questionId = 'website';
    } else if (questionText.includes('social profile')) {
      questionId = 'social_profile';
    } else if (questionText.includes('3 words')) {
      questionId = 'brand_3_words';
    }
    
    console.log(`🎯 Current question: ${questionText.substring(0, 60)}...`);
    
    // Wait a bit more for dynamic content to load
    await this.sleep(300);
    
    // Check for contact question (has checkbox buttons for contact methods)
    const hasContactCheckboxes = Array.from(document.querySelectorAll('button[role="checkbox"]'))
      .some(btn => btn.textContent.toLowerCase().includes('email') || btn.textContent.toLowerCase().includes('phone'));
    
    if (questionText.includes('contact') || hasContactCheckboxes) {
      console.log('📞 Detected contact question');
      return await this.fillContactQuestion();
    }
    
    // Handle radio buttons - look for buttons with role="radio"
    const radioButtons = document.querySelectorAll('button[role="radio"]');
    if (radioButtons.length > 0) {
      console.log(`🔘 Detected radio question with ${radioButtons.length} options`);
      return await this.fillRadioQuestion(questionId);
    }
    
    // Handle checkboxes - look for buttons with role="checkbox" (but not contact methods)
    const checkboxButtons = Array.from(document.querySelectorAll('button[role="checkbox"]'))
      .filter(btn => !btn.textContent.toLowerCase().includes('email') && !btn.textContent.toLowerCase().includes('phone'));
    
    if (checkboxButtons.length > 0) {
      console.log(`☑️ Detected checkbox question with ${checkboxButtons.length} options`);
      return await this.fillCheckboxQuestion(questionId, mode);
    }
    
    // Handle text inputs - look for visible input or textarea elements
    const inputs = document.querySelectorAll('input, textarea');
    const visibleInputs = Array.from(inputs).filter(input => {
      const style = window.getComputedStyle(input);
      const rect = input.getBoundingClientRect();
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             rect.width > 0 && rect.height > 0;
    });
    
    if (visibleInputs.length > 0) {
      console.log(`📝 Detected text input question (${visibleInputs[0].type || visibleInputs[0].tagName})`);
      return await this.fillTextInput(questionId, mode);
    }
    
    // Handle file upload (skip for now)
    if (questionText.includes('upload') || questionText.includes('file')) {
      console.log('📁 Skipping file upload question');
      return true;
    }
    
    console.log('⚠️ Could not determine question type');
    console.log('Available elements:', {
      radioButtons: radioButtons.length,
      checkboxButtons: document.querySelectorAll('button[role="checkbox"]').length,
      inputs: visibleInputs.length,
      allButtons: document.querySelectorAll('button').length
    });
    return false;
  }

  /**
   * Click next button
   */
  async clickNext() {
    // Wait a bit for any animations to complete
    await this.sleep(500);
    
    // First, check for multi-select "Continue" buttons (these appear for checkbox/multiselect questions)
    const continueButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const btnText = btn.textContent.toLowerCase().trim();
      return btnText.includes('continue with') && btnText.includes('selected');
    });
    
    if (continueButtons.length > 0 && !continueButtons[0].disabled) {
      console.log(`➡️ Clicking multi-select continue: ${continueButtons[0].textContent.trim()}`);
      await this.clickElement(continueButtons[0]);
      return true;
    }
    
    // Look for the main navigation buttons in the fixed bottom area
    // The navigation is in a fixed div at bottom with specific structure
    const navigationArea = document.querySelector('.fixed.bottom-6');
    if (navigationArea) {
      // Find the Next/Submit button (it's the rightmost button in the navigation)
      const navButtons = navigationArea.querySelectorAll('button');
      
      // The Next/Submit button should be the last button (rightmost) and have red background
      for (let i = navButtons.length - 1; i >= 0; i--) {
        const btn = navButtons[i];
        const computedStyle = window.getComputedStyle(btn);
        const btnText = btn.textContent.toLowerCase().trim();
        
        // Check if it's the Next/Submit button by background color and text
        if ((btnText.includes('next') || btnText.includes('submit')) && 
            !btn.disabled &&
            (computedStyle.backgroundColor.includes('237, 33, 36') || // RGB for #ED2124
             computedStyle.backgroundColor.includes('rgb(237, 33, 36)') ||
             btn.style.backgroundColor === '#ED2124')) {
          
          console.log(`➡️ Clicking navigation button: ${btn.textContent.trim()}`);
          await this.clickElement(btn);
          return true;
        }
      }
    }
    
    // Fallback: Look for any button with Next, Submit, or Continue text that's not disabled
    const allButtons = Array.from(document.querySelectorAll('button:not([disabled])'));
    const nextBtn = allButtons.find(btn => {
      const btnText = btn.textContent.toLowerCase().trim();
      return btnText.includes('next') || btnText.includes('submit') || 
             (btnText.includes('continue') && !btnText.includes('press enter'));
    });
    
    if (nextBtn) {
      console.log(`➡️ Clicking fallback button: ${nextBtn.textContent.trim()}`);
      await this.clickElement(nextBtn);
      return true;
    }
    
    console.log('❌ Could not find Next/Submit button');
    console.log('Available buttons:', allButtons.map(btn => btn.textContent.trim()));
    return false;
  }

  /**
   * Check if we should fill this question based on mode
   */
  shouldFillQuestion(questionText, mode, questionIndex) {
    // Always fill required questions
    if (this.requiredQuestions.some(req => questionText.toLowerCase().includes(req.replace('_', ' ')))) {
      return true;
    }
    
    switch (mode) {
      case 'full':
        return true;
      case 'partial':
        return Math.random() > 0.3; // 70% chance to fill
      case 'minimal':
        return false; // Only required questions
      default:
        return true;
    }
  }

  /**
   * Main test function
   */
  async runTest(mode = 'full') {
    console.clear();
    console.log(`🚀 Starting form test in ${mode.toUpperCase()} mode`);
    console.log('='.repeat(50));
    
    let questionCount = 0;
    let maxQuestions = 50; // Safety limit
    
    while (questionCount < maxQuestions) {
      questionCount++;
      
      // Check if we're on thank you page
      if (document.body.textContent.includes('Awesome!') || 
          document.body.textContent.includes('Thank you') ||
          document.body.textContent.includes('submitted successfully') ||
          document.querySelector('[class*="party"]') ||
          document.querySelector('div[style*="F1BE3C"]') && document.body.textContent.includes('What happens next')) {
        console.log('🎉 Form completed successfully!');
        console.log('✅ Data should have been sent to N8N webhook');
        console.log('📊 Final form state:', {
          currentUrl: window.location.href,
          hasParticles: !!document.querySelector('[class*="party"]'),
          bodyText: document.body.textContent.substring(0, 200) + '...'
        });
        break;
      }
      
      // Get current question
      const questionTitle = document.querySelector('h1');
      if (!questionTitle) {
        console.log('❌ No question found, test may have failed');
        break;
      }
      
      const questionText = questionTitle.textContent;
      console.log(`\n📋 Question ${questionCount}: ${questionText.substring(0, 60)}...`);
      
      // Decide whether to fill this question
      const shouldFill = this.shouldFillQuestion(questionText, mode, questionCount);
      
      if (shouldFill) {
        const filled = await this.fillCurrentQuestion(mode);
        if (!filled) {
          console.log('⚠️ Could not fill question, trying to skip...');
        }
      } else {
        console.log('⏭️ Skipping optional question');
      }
      
      // Wait a bit and click next
      await this.sleep(1000);
      const clicked = await this.clickNext();
      
      if (!clicked) {
        console.log('❌ Could not find next button, test stopping');
        console.log('Current page state:');
        console.log('- URL:', window.location.href);
        console.log('- Question title:', document.querySelector('h1')?.textContent || 'None');
        console.log('- Available buttons:', Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent.trim(),
          disabled: btn.disabled,
          visible: window.getComputedStyle(btn).display !== 'none'
        })));
        break;
      }
      
      // Wait for next question to load
      await this.sleep(2000); // Increased wait time for better stability
    }
    
    if (questionCount >= maxQuestions) {
      console.log('⚠️ Reached maximum question limit, test stopped');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Test completed');
  }

  /**
   * Quick test without delays (for development)
   */
  async quickTest(mode = 'full') {
    this.sleep = () => Promise.resolve(); // Override sleep
    await this.runTest(mode);
  }
}

// Global functions for easy access
window.formTester = new FormTester();

/**
 * Test the form with different modes
 * @param {string} mode - 'full', 'partial', or 'minimal'
 * @param {boolean} quick - Skip animations for faster testing
 */
function testForm(mode = 'full', quick = false) {
  if (quick) {
    return window.formTester.quickTest(mode);
  } else {
    return window.formTester.runTest(mode);
  }
}

/**
 * Test all three modes sequentially (for comprehensive testing)
 */
async function testAllModes() {
  console.log('🎯 Running comprehensive test suite...\n');
  
  // Reload page before each test
  for (const mode of ['minimal', 'partial', 'full']) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TESTING MODE: ${mode.toUpperCase()}`);
    console.log('='.repeat(60));
    
    await testForm(mode, true);
    
    if (mode !== 'full') {
      console.log('\n⏳ Reloading page for next test...');
      await new Promise(resolve => {
        setTimeout(() => {
          window.location.reload();
          setTimeout(resolve, 3000);
        }, 2000);
      });
    }
  }
  
  console.log('\n🎉 All tests completed!');
}

// Helper function to check N8N webhook
function checkWebhookStatus() {
  console.log('🔍 Checking N8N webhook configuration...');
  
  // Check if webhook URL is available in window object or other global variables
  const possibleWebhookSources = [
    window.VITE_N8N_WEBHOOK_URL,
    window.N8N_WEBHOOK_URL,
    process?.env?.VITE_N8N_WEBHOOK_URL, // This might not work in browser
    'https://n8n.hexoforge.com/webhook/fdf5f9a4-c556-4674-9f60-20cf1ff0cb89' // Fallback from original
  ];
  
  const webhookUrl = possibleWebhookSources.find(url => url) || 'https://n8n.hexoforge.com/webhook/fdf5f9a4-c556-4674-9f60-20cf1ff0cb89';
  
  console.log('Webhook URL:', webhookUrl);
  
  // Test webhook with sample data
  const testPayload = {
    test: true,
    timestamp: new Date().toISOString(),
    message: 'Test payload from form tester'
  };
  
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  })
  .then(response => {
    console.log('✅ Webhook test response:', response.status, response.statusText);
    return response.text();
  })
  .then(data => {
    console.log('Response data:', data);
  })
  .catch(error => {
    console.log('❌ Webhook test failed:', error);
  });
}

// Instructions
console.log(`
🧪 FORM TESTING SCRIPT LOADED (FIXED VERSION)
==============================================

✅ FIXED ISSUES:
• Next button detection now works properly
• Better handling of multi-select "Continue" buttons
• Improved question type detection
• Better error handling and debugging
• Fixed navigation for all question types

Available Commands:
• testForm('full')     - Fill all questions with comprehensive data
• testForm('partial')  - Fill random questions + all required ones  
• testForm('minimal')  - Fill only required questions
• testForm('full', true) - Quick test without animations
• testAllModes()       - Test all three modes sequentially
• checkWebhookStatus() - Test N8N webhook connection

Examples:
testForm('full')       // Complete form with all data
testForm('partial')    // Partial form data (70% of optional questions)
testForm('minimal')    // Only required fields

🔧 DEBUG FEATURES:
• Detailed console logging for each step
• Button detection diagnostics
• Question type identification
• Navigation state tracking

Start testing! 🚀
`);