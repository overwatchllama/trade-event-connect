import sys
import re

file_path = 'src/pages/Inventory.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add onlyUnprinted state
content = content.replace(
    'const [adjHistoryItemIds, setAdjHistoryItemIds] = useState<string[] | undefined>(undefined);',
    'const [adjHistoryItemIds, setAdjHistoryItemIds] = useState<string[] | undefined>(undefined);\n  const [onlyUnprinted, setOnlyUnprinted] = useState(false);'
)

# 2. Add Tooltip imports
if 'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";' not in content:
    content = 'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\n' + content

# 3. Update filtered useMemo
content = content.replace(
    'if (eventScope !== "all") {\n      base = base.filter((i) => eventMemberships.get(i.id)?.has(eventScope));\n    }',
    'if (eventScope !== "all") {\n      base = base.filter((i) => eventMemberships.get(i.id)?.has(eventScope));\n    }\n    if (onlyUnprinted) {\n      base = base.filter((i) => !i.label_printed_at);\n    }'
)

# 4. Add filter chip UI
filter_chip_ui = """
        <div className="flex items-center gap-2 mb-4">
          <Badge 
            variant={onlyUnprinted ? "default" : "outline"} 
            className="cursor-pointer py-1 px-3"
            onClick={() => setOnlyUnprinted(!onlyUnprinted)}
          >
            {onlyUnprinted ? "Filtering: Never printed" : "Filter: Never printed"}
          </Badge>
          {onlyUnprinted && (
            <Button variant="ghost" size="sm" onClick={() => setOnlyUnprinted(false)} className="h-7 px-2 text-xs">
              Clear
            </Button>
          )}
        </div>"""

# Insert before the Totals grid
content = content.replace(
    '<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">',
    filter_chip_ui + '\n\n        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">'
)

# 5. Update printer badge in table
# Original code:
#                                 {i.label_printed_at && (
#                                   <BadgeUi
#                                     variant="outline"
#                                     className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
#                                     title={`Last printed ${new Date(i.label_printed_at).toLocaleString()}${i.label_print_count > 1 ? ` · ${i.label_print_count} prints` : ""}`}
#                                   >
#                                     <Printer className="h-2.5 w-2.5 mr-0.5" />
#                                     Printed{i.label_print_count > 1 ? ` ×${i.label_print_count}` : ""}
#                                   </BadgeUi>
#                                 )}

new_printer_badge = """                                {i.label_printed_at && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <BadgeUi
                                          variant="outline"
                                          className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1"
                                        >
                                          <Printer className="h-2.5 w-2.5" />
                                          <span>Printed</span>
                                          {i.label_print_count > 1 && (
                                            <sup className="text-[8px] leading-none ml-0.5">×{i.label_print_count}</sup>
                                          )}
                                        </BadgeUi>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Last printed {new Date(i.label_printed_at).toLocaleString()}</p>
                                        {i.label_print_count > 1 && <p>{i.label_print_count} total prints</p>}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}"""

content = re.sub(
    r'\{i\.label_printed_at && \(.*?<BadgeUi.*?Printed\{i\.label_print_count > 1 \? ` ×\$\{i\.label_print_count\}` : ""\}.*?<\/BadgeUi>.*?\)\}',
    new_printer_badge,
    content,
    flags=re.DOTALL
)

# 6. Implement handleReprintBatch and pass it to PrintHistoryDialog
content = content.replace(
    'const [adjHistoryItemIds, setAdjHistoryItemIds] = useState<string[] | undefined>(undefined);',
    'const [adjHistoryItemIds, setAdjHistoryItemIds] = useState<string[] | undefined>(undefined);\n  const [onlyUnprinted, setOnlyUnprinted] = useState(false);'
).replace(
    'const [onlyUnprinted, setOnlyUnprinted] = useState(false);\n  const [onlyUnprinted, setOnlyUnprinted] = useState(false);',
    'const [onlyUnprinted, setOnlyUnprinted] = useState(false);'
) # Deduplicate if needed

reprint_batch_fn = """
  const handleReprintBatch = async (itemIds: string[]) => {
    if (itemIds.length === 0 || !user) return;
    const { data, error } = await supabase
      .from("deal_list_items")
      .select("id")
      .eq("user_id", user.id)
      .in("id", itemIds);
    
    if (error || !data) {
      toast({ title: "Failed to fetch items for reprint", description: error?.message, variant: "destructive" });
      return;
    }
    
    setPrintItemIds(data.map(i => i.id));
    setPrintSource("history_reprint");
    setHistoryOpen(false);
    setPrintOpen(true);
  };
"""

content = content.replace(
    'const removeFromEvent = async (ids: string[]) => {',
    reprint_batch_fn + '\n\n  const removeFromEvent = async (ids: string[]) => {'
)

# Update PrintHistoryDialog tag
content = content.replace(
    '<PrintHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />',
    '<PrintHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} onReprintBatch={handleReprintBatch} />'
)

with open(file_path, 'w') as f:
    f.write(content)
