import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2 } from 'lucide-react';

interface CollectionSubNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedTcg: string;
  onTcgChange: (tcg: string) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
}

const CollectionSubNav = ({
  activeTab,
  onTabChange,
  selectedTcg,
  onTcgChange,
  selectedLanguage,
  onLanguageChange,
}: CollectionSubNavProps) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sets', label: 'Sets' },
    { id: 'cards', label: 'Cards' },
    { id: 'sealed', label: 'Sealed' },
    { id: 'slabs', label: 'Slabs' },
    { id: 'lists', label: 'Lists' },
  ];

  return (
    <div className="bg-card border-b border-border sticky top-16 z-30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedTcg} onValueChange={onTcgChange}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pokemon">Pokémon TCG</SelectItem>
                <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                <SelectItem value="lorcana">Disney Lorcana</SelectItem>
                <SelectItem value="onepiece">One Piece</SelectItem>
                <SelectItem value="sports">Sports Cards</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="international">🌐 International</SelectItem>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                <SelectItem value="ko">🇰🇷 Korean</SelectItem>
                <SelectItem value="zh-TW">🇹🇼 Chinese (Traditional)</SelectItem>
                <SelectItem value="zh-CN">🇨🇳 Chinese (Simplified)</SelectItem>
                <SelectItem value="fr">🇫🇷 French</SelectItem>
                <SelectItem value="de">🇩🇪 German</SelectItem>
                <SelectItem value="it">🇮🇹 Italian</SelectItem>
                <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                <SelectItem value="pt">🇧🇷 Portuguese</SelectItem>
                <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
                <SelectItem value="pl">🇵🇱 Polish</SelectItem>
                <SelectItem value="ru">🇷🇺 Russian</SelectItem>
                <SelectItem value="th">🇹🇭 Thai</SelectItem>
                <SelectItem value="id">🇮🇩 Indonesian</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-8">
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Share my collection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionSubNav;
