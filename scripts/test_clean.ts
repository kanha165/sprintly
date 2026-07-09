import fs from 'fs';
import path from 'path';
import { cleanTasks } from '../src/lib/clean';

function runTest() {
  console.log('Running Data Cleaning Engine Unit Test...');

  // 1. Resolve path to tasks.json
  const tasksJsonPath = path.join(__dirname, '../src/data/tasks.json');
  if (!fs.existsSync(tasksJsonPath)) {
    console.error(`Error: tasks.json not found at ${tasksJsonPath}`);
    process.exit(1);
  }

  // 2. Read raw data
  const rawData = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf-8'));
  console.log(`Successfully loaded raw tasks.json with ${rawData.length} records.`);

  // 3. Clean tasks
  const { cleaned, issuesFixed, tasksLoaded } = cleanTasks(rawData);

  console.log('\n--- Cleaning Summary ---');
  console.log(`Issues Fixed: ${issuesFixed}`);
  console.log(`Tasks Loaded: ${tasksLoaded}`);
  console.log('------------------------\n');

  // Verify that the task counts match expectations
  const expectedIssuesFixed = 13;
  const expectedTasksLoaded = 37;

  let success = true;

  if (issuesFixed !== expectedIssuesFixed) {
    console.error(`[FAIL] Expected issuesFixed to be ${expectedIssuesFixed}, but got ${issuesFixed}.`);
    success = false;
  } else {
    console.log(`[PASS] issuesFixed matches expected ${expectedIssuesFixed}.`);
  }

  if (tasksLoaded !== expectedTasksLoaded) {
    console.error(`[FAIL] Expected tasksLoaded to be ${expectedTasksLoaded}, but got ${tasksLoaded}.`);
    success = false;
  } else {
    console.log(`[PASS] tasksLoaded matches expected ${expectedTasksLoaded}.`);
  }

  // 4. Verify some details on the repaired items
  const task4 = cleaned.find(t => t.id === 'task-4');
  if (task4?.assignee !== 'Unassigned') {
    console.error(`[FAIL] task-4 assignee should be Unassigned, but got ${task4?.assignee}`);
    success = false;
  }

  const task7 = cleaned.find(t => t.id === 'task-7');
  if (task7?.estimate_hours !== 0) {
    console.error(`[FAIL] task-7 negative estimate should be 0, but got ${task7?.estimate_hours}`);
    success = false;
  }

  const task10 = cleaned.find(t => t.id === 'task-10');
  if (task10?.status !== 'Backlog' || !task10?.has_warning) {
    console.error(`[FAIL] task-10 status should be Backlog with has_warning: true, but got status: ${task10?.status}, has_warning: ${task10?.has_warning}`);
    success = false;
  }

  // SILENT NORMALIZATION CHECK: check task-5 status "backlog" -> "Backlog"
  const task5 = cleaned.find(t => t.id === 'task-5');
  if (task5?.status !== 'Backlog') {
    console.error(`[FAIL] task-5 lowercase status "backlog" should be normalized to "Backlog", but got: ${task5?.status}`);
    success = false;
  }

  // SILENT NORMALIZATION CHECK: check task-28 string numeric estimate "8" -> parsed as number 8
  const task2 = cleaned.find(t => t.id === 'task-dup-2');
  if (task2?.estimate_hours !== 8) {
    console.error(`[FAIL] task-dup-2 estimate "8" string should be parsed to 8, but got: ${task2?.estimate_hours}`);
    success = false;
  }

  if (success) {
    console.log('\n[SUCCESS] Data cleaning unit test completed successfully!');
    process.exit(0);
  } else {
    console.error('\n[FAILURE] Data cleaning unit test failed.');
    process.exit(1);
  }
}

runTest();
