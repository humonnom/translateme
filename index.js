const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs').promises;
const OpenAI = require('openai');

async function configureGit() {
    await exec.exec('git', ['config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    await exec.exec('git', ['config', '--global', 'user.name', 'github-actions[bot]']);
}

async function commitAndPush(outputFile) {
    try {
        await exec.exec('git', ['add', outputFile]);
        try {
            await exec.exec('git', ['commit', '-m', `Update translation: ${outputFile}`]);
        } catch (error) {
            console.log('No changes to commit');
            return;
        }
        await exec.exec('git', ['push']);
    } catch (error) {
        throw new Error(`Failed to commit and push changes: ${error.message}`);
    }
}

async function run() {
    try {
        const sourceFile = core.getInput('source_file');
        const targetLanguage = 'ja';
        const apiKey = core.getInput('api_key');

        const openai = new OpenAI({
            apiKey: apiKey
        });

        await configureGit();

        const content = await fs.readFile(sourceFile, 'utf8');

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are a professional translator. Translate the given markdown content to ${targetLanguage} while preserving all markdown formatting, code blocks, and links.`
                },
                {
                    role: "user",
                    content: `Please translate the following markdown content to ${targetLanguage}:\n\n${content}`
                }
            ],
            temperature: 0.3,
            max_tokens: 4000
        });

        const translatedContent = response.choices[0].message.content;
        const outputFile = `README.${targetLanguage}.md`;
        await fs.writeFile(outputFile, translatedContent, 'utf8');

        await commitAndPush(outputFile);

        core.setOutput('translated_file', outputFile);
        console.log(`Translation completed and pushed: ${outputFile}`);

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
