#!/usr/bin/env node

/**
 * Basic NPMSafe Usage Example
 * 
 * This example demonstrates how to use NPMSafe as a library
 * to scan for secrets and analyze version changes.
 */

const { NPMSafe } = require('../dist/index.js');

async function main() {
  console.log('🚦 NPMSafe Basic Usage Example\n');

  // Initialize NPMSafe with custom configuration
  const npmsafe = new NPMSafe({
    config: {
      blockPublishOnSecret: true,
      autoVersion: true,
      changelog: true
    }
  });

  // Example 1: Scan for secrets
  console.log('1. 🔐 Scanning for secrets...');
  try {
    const secrets = await npmsafe.scan({
      patterns: ['examples/**/*'],
      exclude: ['node_modules/**'],
      entropy: 3.5
    });

    if (secrets.length === 0) {
      console.log('✅ No secrets found!');
    } else {
      console.log(`🚨 Found ${secrets.length} potential secrets:`);
      secrets.forEach(secret => {
        console.log(`  • ${secret.file}:${secret.line} - ${secret.pattern.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Error scanning for secrets:', error.message);
  }

  // Example 2: Analyze version changes
  console.log('\n2. 🔢 Analyzing version changes...');
  try {
    const analysis = await npmsafe.analyzeVersion('1.2.3', {
      since: '2024-01-01'
    });

    console.log(`Current version: ${analysis.currentVersion}`);
    console.log(`Recommended bump: ${analysis.recommendedBump}`);
    console.log(`New version: ${analysis.newVersion}`);
    console.log(`Confidence: ${analysis.confidence.toFixed(1)}%`);

    if (analysis.reasons.length > 0) {
      console.log('Reasons:');
      analysis.reasons.forEach(reason => {
        console.log(`  • ${reason}`);
      });
    }
  } catch (error) {
    console.error('❌ Error analyzing version:', error.message);
  }

  // Example 3: Generate changelog
  console.log('\n3. 📝 Generating changelog...');
  try {
    const changelog = await npmsafe.generateChangelog('2.0.0', '2024-01-01');
    console.log('Generated changelog:');
    console.log(changelog);
  } catch (error) {
    console.error('❌ Error generating changelog:', error.message);
  }

  // Example 4: Add custom secret pattern
  console.log('\n4. 🎯 Adding custom secret pattern...');
  npmsafe.addSecretPattern({
    name: 'Example API Key',
    pattern: /example_[a-zA-Z0-9]{16}/,
    description: 'Example API Key Pattern',
    severity: 'medium'
  });
  console.log('✅ Custom pattern added');

  // Example 5: Add allowed secret
  console.log('\n5. ✅ Adding allowed secret...');
  npmsafe.addAllowedSecret('example_allowed_key_123456');
  console.log('✅ Allowed secret added');

  console.log('\n🎉 NPMSafe basic usage example completed!');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 