const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  try {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();

    console.log("Registering User 1...");
    await page1.goto('http://localhost:5173/register');
    await page1.waitForSelector('input[name="username"]');
    const user1 = 'alice_' + Date.now();
    await page1.type('input[name="username"]', user1);
    await page1.type('input[name="email"]', user1 + '@test.com');
    await page1.type('input[name="displayName"]', 'Alice');
    await page1.type('input[name="password"]', 'password123');
    await page1.type('input[name="confirmPassword"]', 'password123');
    await page1.click('button[type="submit"]');
    await page1.waitForFunction(() => window.location.pathname === '/', { timeout: 10000 });
    console.log("User 1 (Alice) registered and logged in.");

    console.log("Registering User 2...");
    const context2 = await browser.createIncognitoBrowserContext();
    const page3 = await context2.newPage();
    await page3.goto('http://localhost:5173/register');
    await page3.waitForSelector('input[name="username"]');
    const user2 = 'bob_' + Date.now();
    await page3.type('input[name="username"]', user2);
    await page3.type('input[name="email"]', user2 + '@test.com');
    await page3.type('input[name="displayName"]', 'Bob');
    await page3.type('input[name="password"]', 'password123');
    await page3.type('input[name="confirmPassword"]', 'password123');
    await page3.click('button[type="submit"]');
    await page3.waitForFunction(() => window.location.pathname === '/', { timeout: 10000 });
    console.log("User 2 (Bob) registered and logged in.");

    console.log("User 1 searching for Bob...");
    await page1.waitForSelector('input[placeholder="Search users..."]', { timeout: 5000 });
    await page1.type('input[placeholder="Search users..."]', user2);
    
    await page1.waitForSelector('.flex.items-center.justify-between.p-3', { timeout: 5000 });
    await page1.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const msgBtn = Array.from(buttons).find(b => b.innerHTML.includes('Message') || b.querySelector('svg.lucide-message-square'));
      if(msgBtn) msgBtn.click();
    });

    await page1.waitForSelector('input[placeholder="Type a message"]', { timeout: 5000 });
    
    console.log("User 1 sending message to Bob...");
    await page1.type('input[placeholder="Type a message"]', 'Hello Bob, this is a Socket.IO test message!');
    await page1.evaluate(() => {
      // Find the send button (it has a Send icon)
      const buttons = document.querySelectorAll('button');
      const sendBtn = Array.from(buttons).find(b => b.innerHTML.includes('lucide-send') || b.querySelector('svg.lucide-send'));
      if(sendBtn) sendBtn.click();
      else {
          const form = document.querySelector('form');
          if(form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
    
    console.log("Message sent! Checking if Bob received it...");
    
    // Wait for the message in Alice's screen first to ensure it's rendered locally
    await page1.waitForFunction(() => document.body.innerText.includes('Socket.IO test message!'), { timeout: 5000 });

    await page3.waitForSelector('h3', { timeout: 5000 });
    await page3.evaluate(() => {
      const h3s = document.querySelectorAll('h3');
      const aliceChat = Array.from(h3s).find(h => h.textContent.includes('Alice'));
      if(aliceChat) aliceChat.click();
    });

    await page3.waitForFunction(() => {
      return document.body.innerText.includes('Socket.IO test message!');
    }, { timeout: 5000 });
    
    console.log("SUCCESS! Bob received the message in real-time.");
    
  } catch(e) {
    console.error("Test failed: ", e);
  } finally {
    await browser.close();
  }
})();

