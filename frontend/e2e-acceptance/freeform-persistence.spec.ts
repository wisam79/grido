import { canvasSnapshot, dragCanvasNode, expectElementCount } from './helpers/canvas-readonly';
import {
  addText,
  ensureSingle,
  importImages,
  renameSelectedLayer,
  reopenProject,
  runCommand,
  saveProject,
} from './helpers/gui';
import { test, expect, readPersistedAutosave } from './helpers/real-app';

// All user mutations here are clicks, text input, keyboard or mouse gestures.
test('[J01] GUI login freeform text shape group lock history and backend restart persistence', async ({
  journey,
}) => {
  let page = journey.page;
  await ensureSingle(page);
  await importImages(journey, [journey.inputs.landscape]);
  await expectElementCount(page, 1);
  await renameSelectedLayer(page, 'Journey image');
  const text = `قبول حقيقي ${journey.name} Latin 123`;
  const textId = await addText(page, text);
  await renameSelectedLayer(page, 'Journey text');
  await runCommand(page, 'insert-rect');
  await expectElementCount(page, 3);
  const shapeRow = await renameSelectedLayer(page, 'Journey shape');
  const beforeDrag = (await canvasSnapshot(page)).elements.find(
    (el) => el.name === 'Journey shape',
  )!;
  await dragCanvasNode(page, beforeDrag.id, 65, 35);
  await expect
    .poll(
      async () => (await canvasSnapshot(page)).elements.find((el) => el.id === beforeDrag.id)?.x,
    )
    .not.toBe(beforeDrag.x);
  const afterDrag = (await canvasSnapshot(page)).elements.find((el) => el.id === beforeDrag.id)!;
  await page.getByTestId('toolbar-undo').click();
  await expect
    .poll(
      async () => (await canvasSnapshot(page)).elements.find((el) => el.id === beforeDrag.id)?.x,
    )
    .toBe(beforeDrag.x);
  await page.getByTestId('toolbar-redo').click();
  await expect
    .poll(
      async () => (await canvasSnapshot(page)).elements.find((el) => el.id === beforeDrag.id)?.x,
    )
    .toBe(afterDrag.x);
  const list = page.getByRole('list', { name: 'قائمة الطبقات' });
  await list.getByRole('button', { name: 'Journey text', exact: true }).click();
  await list
    .getByRole('button', { name: 'Journey shape', exact: true })
    .click({ modifiers: ['Control'] });
  await page
    .getByTestId('toolbar-selection-group')
    .getByRole('button', { name: 'تجميع', exact: true })
    .click();
  await expect
    .poll(async () => {
      const items = (await canvasSnapshot(page)).elements.filter(
        (el) => el.id === textId || el.id === beforeDrag.id,
      );
      return !!items[0]?.groupId && items[0].groupId === items[1]?.groupId;
    })
    .toBe(true);
  await shapeRow.getByRole('button', { name: 'قفل الطبقة', exact: true }).click();
  await expect(shapeRow.getByRole('button', { name: 'فك القفل', exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        (await canvasSnapshot(page)).elements.find((el) => el.id === beforeDrag.id)?.locked,
    )
    .toBe(true);
  // Deletion attempts cannot remove a locked grouped member.
  await list.getByRole('button', { name: 'Journey shape', exact: true }).click();
  await page.keyboard.press('Delete');
  await expect
    .poll(async () => (await canvasSnapshot(page)).elements.some((el) => el.id === beforeDrag.id))
    .toBe(true);
  await saveProject(page, journey.name);
  const savedCanvas = await canvasSnapshot(page);
  let saved: Record<string, unknown> | undefined;
  await expect
    .poll(
      async () => {
        try {
          saved = await readPersistedAutosave(journey.runtime);
          return saved.projectId && JSON.stringify(saved).includes(text);
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    )
    .toBeTruthy();
  expect(saved!.projectId).toEqual(expect.any(String));
  journey.record('freeform-gui-edit-history-lock-group', {
    textId,
    shapeId: beforeDrag.id,
    savedProjectId: saved!.projectId,
    elements: savedCanvas.elements,
  });
  page = await journey.restart();
  await reopenProject(page, journey.name);
  await expect
    .poll(async () =>
      (await canvasSnapshot(page)).elements.map((el) => ({
        id: el.id,
        type: el.type,
        text: el.text,
        imageSrc: el.imageSrc,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        groupId: el.groupId,
        locked: el.locked,
      })),
    )
    .toEqual(
      savedCanvas.elements.map((el) => ({
        id: el.id,
        type: el.type,
        text: el.text,
        imageSrc: el.imageSrc,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        groupId: el.groupId,
        locked: el.locked,
      })),
    );
  await expect
    .poll(async () => (await readPersistedAutosave(journey.runtime)).projectId)
    .toBe(saved!.projectId);
  expect((await canvasSnapshot(page)).nodes.some((node) => node.text === text)).toBe(true);
  journey.record('same-project-reopen-after-process-restart', {
    projectId: saved!.projectId,
    text,
    images: savedCanvas.elements.filter((el) => el.imageSrc).map((el) => el.imageSrc),
    geometryExact: true,
  });
  await journey.checkpoint('project-reopened');
});
