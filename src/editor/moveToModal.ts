/* The picker for "move to": every heading and list item in the file,
 * fuzzy-searchable, each row indented by its depth. It decides nothing;
 * it hands the chosen line to the operation. */
import { FuzzySuggestModal } from 'obsidian';
import type { App, FuzzyMatch } from 'obsidian';
import { CLASS_PREFIX, INK_PLUGIN_ATTR, PLUGIN_ID } from '../constants';
import type { MoveTarget } from '../moveTo';

export class MoveToModal extends FuzzySuggestModal<MoveTarget> {
  constructor(
    app: App,
    private readonly targets: MoveTarget[],
    private readonly onChoose: (target: MoveTarget) => void,
  ) {
    super(app);
    this.setPlaceholder('Move the item under...');
    this.modalEl.addClass('icor-outliner-move-to');
    this.modalEl.setAttr(INK_PLUGIN_ATTR, PLUGIN_ID);
  }

  getItems(): MoveTarget[] {
    return this.targets;
  }

  getItemText(target: MoveTarget): string {
    return target.text;
  }

  override renderSuggestion(match: FuzzyMatch<MoveTarget>, el: HTMLElement): void {
    super.renderSuggestion(match, el);
    el.addClass('icor-outliner-move-target');
    el.addClass(`${CLASS_PREFIX}move-target-${match.item.kind}`);
    el.setCssProps({ '--icor-outliner-depth': String(match.item.depth - 1) });
  }

  onChooseItem(target: MoveTarget): void {
    this.onChoose(target);
  }
}
