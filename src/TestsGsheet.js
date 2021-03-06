/**
 * @author David Menger
 */
'use strict';

// @ts-ignore
const { GoogleSpreadsheet } = require('google-spreadsheet');

const INPUT_FIELD = 'User input text or #interaction-path';
const TEXTS_TEST_TITLE = 'NLP test';


/**
 * @typedef {object} TestCaseStep
 * @prop {number} step
 * @prop {number} rowNum
 * @prop {string} action
 * @prop {string} passedAction
 * @prop {string} textContains
 * @prop {string} quickRepliesContains
 * @prop {string} stepDescription
 */

/**
 * @typedef {object} TestCase
 * @prop {string} list
 * @prop {string} name
 * @prop {TestCaseStep[]} steps
 */

/**
 * Google sheets storage for test cases
 */
class TestsGsheet {


    /**
     *
     * @param {string} sheetId
     * @param {object} [googleToken]
     */
    constructor (sheetId, googleToken = null) {
        this._gs = new GoogleSpreadsheet(sheetId);
        this._googleToken = googleToken;
    }


    async _authorize () {
        return this._gs.useServiceAccountAuth(this._googleToken);
    }

    async _getInfo () {
        return this._gs.loadInfo();
    }

    _getRows (ws) {
        return ws.getRows({ offset: 0, limit: ws.rowCount });
    }

    /**
     * @returns {Promise<TestCase[]>}
     */
    async getTestCases () {
        if (this._googleToken) {
            await this._authorize();
        }

        await this._getInfo();
        const worksheets = this._gs.sheetsByIndex;

        const lists = await Promise.all(worksheets
            .map((ws) => this._getRows(ws)));

        const testCases = [];

        lists.forEach((rows, i) => {
            const sheet = worksheets[i];
            let testCase;
            let rowNum = 1;
            for (const row of rows) {
                rowNum++;
                if (row.Text) {
                    // @ts-ignore
                    if (!testCase || testCase.list !== sheet.title) {
                        testCase = testCases
                            // @ts-ignore
                            .find((t) => t.list === sheet.title && t.name === TEXTS_TEST_TITLE);

                        if (!testCase) {
                            testCase = {
                                // @ts-ignore
                                list: sheet.title,
                                name: TEXTS_TEST_TITLE,
                                texts: []
                            };
                            testCases.push(testCase);
                        }
                    }

                    testCase.texts.push({
                        text: row.Text,
                        intent: row.intent || null,
                        action: row.action || null,
                        appId: row.appid || null
                    });
                } else if (!testCase || (row.Testcase && !row[INPUT_FIELD])) {
                    testCase = {
                        // @ts-ignore
                        list: sheet.title,
                        name: row.Testcase,
                        steps: []
                    };
                    testCases.push(testCase);
                } else {
                    const action = row[INPUT_FIELD];
                    const {
                        'First interaction path of chatbot response': passedAction = '',
                        'Chatbot text reactions contains': textContains = '',
                        'Quick replies texts contains': quickRepliesContains = '',
                        'Input description': stepDescription = ''
                    } = row;
                    testCase.steps.push({
                        step: testCase.steps.length + 1,
                        rowNum,
                        action,
                        passedAction,
                        textContains,
                        quickRepliesContains,
                        stepDescription
                    });
                }
            }
        });

        return testCases;
    }
}

module.exports = TestsGsheet;
