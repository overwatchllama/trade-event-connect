import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import type { CardCategory } from '@/hooks/useCollection';

interface WishlistDialogProps {
  game: CardCategory;
  trigger?: React.ReactNode;
}

export const WishlistDialog: React.FC<WishlistDialogProps> = ({ game, trigger }) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Heart className="h-4 w-4 mr-2" />
            Wishlist
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-red-500" />
            My Wishlist
          </DialogTitle>
          <DialogDescription>
            Wishlist feature coming soon
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Coming Soon
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            The wishlist feature requires database tables that haven't been created yet.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
