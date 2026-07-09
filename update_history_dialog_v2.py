import sys
import re

file_path = 'src/components/inventory/PrintHistoryDialog.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update Props and interface
if 'onReprintBatch' not in content:
    content = content.replace(
        'export const PrintHistoryDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {',
        'export const PrintHistoryDialog = ({ open, onOpenChange, onReprintBatch }: { open: boolean; onOpenChange: (v: boolean) => void; onReprintBatch?: (itemIds: string[]) => void }) => {'
    )

# 2. Add imports
if 'import { Card } from "@/components/ui/card";' not in content:
    content = 'import { Card } from "@/components/ui/card";\nimport { Button } from "@/components/ui/button";\n' + content

# 3. Update the rendering logic
grouped_logic = """
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {(() => {
              const groups: Record<string, { preset: string | null; created_at: string; itemIds: Set<string>; labelCount: number; reprintCount: number }> = {};
              rows.forEach(r => {
                const d = new Date(r.created_at);
                const key = `${r.preset}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
                if (!groups[key]) {
                  groups[key] = { preset: r.preset, created_at: r.created_at, itemIds: new Set<string>(), labelCount: 0, reprintCount: 0 };
                }
                if (r.item_ids) r.item_ids.forEach(id => groups[key].itemIds.add(id));
                groups[key].labelCount += r.label_count || 0;
                groups[key].reprintCount += r.reprint_count || 0;
              });

              return Object.values(groups).map((group, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">
                          {new Date(group.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(group.created_at).toLocaleDateString()}
                        </span>
                        {group.preset && (
                          <Badge variant="outline" className="text-[10px] font-normal uppercase">
                            {group.preset}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{group.labelCount} labels</span> · {group.reprintCount} reprints · {group.itemIds.size} unique items
                      </p>
                    </div>
                    {onReprintBatch && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8"
                        onClick={() => onReprintBatch(Array.from(group.itemIds))}
                      >
                        <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                        Reprint batch
                      </Button>
                    )}
                  </div>
                </Card>
              ));
            })()}
          </div>"""

# Robust replacement: find the div and replace until the end of the block
start_tag = '<div className="max-h-[60vh] overflow-y-auto divide-y">'
if start_tag in content:
    # Find the matching closing div for this block. 
    # Since we know the structure, we can just search for the end of the map/div block.
    # The block ends before the closing ) and } of the JSX expression.
    
    # We'll use a regex that matches from start_tag to the end of the map block.
    pattern = re.escape(start_tag) + r'.*?</div>\s+\)\s+}'
    content = re.sub(pattern, grouped_logic + '\n        ) }', content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)
