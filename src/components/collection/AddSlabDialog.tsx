import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const GRADING_COMPANIES = [
  { id: 'psa', acronym: 'PSA', full: 'Professional Sports Authenticator' },
  { id: 'bgs', acronym: 'BGS', full: 'Beckett Grading Services' },
  { id: 'sgc', acronym: 'SGC', full: 'Sportscard Guaranty Corporation' },
  { id: 'cgc', acronym: 'CGC', full: 'Certified Guaranty Company' },
  { id: 'ags', acronym: 'AGS', full: 'Automated Grading Systems' },
  { id: 'tcg', acronym: 'TCG', full: 'TCG Grading' },
];

const GRADES = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];

const AddSlabDialog = () => {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [grade, setGrade] = useState('');
  const [isBlackLabel, setIsBlackLabel] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [setName, setSetName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!company || !grade || !cardName) {
      toast({ title: 'Missing fields', description: 'Please fill in company, grade, and card name.', variant: 'destructive' });
      return;
    }
    // TODO: Save to database
    toast({ title: 'Slab Added', description: `${cardName} - ${company.toUpperCase()} ${grade}${isBlackLabel ? ' (BLK)' : ''}` });
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setCompany('');
    setGrade('');
    setIsBlackLabel(false);
    setCertNumber('');
    setCardName('');
    setSetName('');
    setPurchasePrice('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Slab
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Graded Slab</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Grading Company *</Label>
            <Select value={company} onValueChange={(v) => { setCompany(v); setIsBlackLabel(false); }}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {GRADING_COMPANIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.acronym} — {c.full}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Grade *</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {company === 'bgs' && (
              <div className="flex-1">
                <Label>Black Label</Label>
                <Select value={isBlackLabel ? 'yes' : 'no'} onValueChange={(v) => setIsBlackLabel(v === 'yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">BLK (Black Label)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label>Cert # (Certificate Number)</Label>
            <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="e.g. 12345678" />
          </div>

          <div>
            <Label>Card Name *</Label>
            <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="e.g. Charizard VMAX" />
          </div>

          <div>
            <Label>Set Name</Label>
            <Input value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="e.g. Champion's Path" />
          </div>

          <div>
            <Label>Purchase Price</Label>
            <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Slab</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSlabDialog;
