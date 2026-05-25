import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Trash2, Edit2, Plus } from "lucide-react";

export default function BarberManagementPage() {
  const { data: barbers, isLoading, refetch } = trpc.barbers.getAllAdmin.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [isCreating, setIsCreating] = useState(false);

  const createMutation = trpc.barbers.create.useMutation({
    onSuccess: () => {
      refetch();
      setFormData({ name: "", phone: "", email: "" });
      setIsCreating(false);
    },
  });

  const updateMutation = trpc.barbers.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setFormData({ name: "", phone: "", email: "" });
    },
  });

  const deleteMutation = trpc.barbers.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteConfirm(null);
    },
  });

  const toggleMutation = trpc.barbers.toggle.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      await updateMutation.mutateAsync({
        barberId: editingId,
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
      });
    } else {
      await createMutation.mutateAsync({
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
      });
    }
  };

  const startEdit = (barber: any) => {
    setEditingId(barber.id);
    setFormData({
      name: barber.name,
      phone: barber.phone || "",
      email: barber.email || "",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestionare Frizeri</h1>
          <p className="text-muted-foreground">Adaugă, editează sau șterge frizerii care lucrează în salon</p>
        </div>

        {/* Add/Edit Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingId ? "Editează frizer" : "Adaugă frizer nou"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nume *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Ion Popescu"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Telefon</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="ex: 0700123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ex: ion@example.com"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Salvează modificări" : "Adaugă frizer"}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: "", phone: "", email: "" });
                    }}
                  >
                    Anulează
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Barbers List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Frizeri ({barbers?.length || 0})</h2>

          {!barbers || barbers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nu sunt frizeri adăugați. Adaugă primul frizer pentru a începe!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {barbers.map((barber: any) => (
                <Card key={barber.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{barber.name}</h3>
                          <Badge variant={barber.isActive === 1 ? "default" : "secondary"}>
                            {barber.isActive === 1 ? "Activ" : "Inactiv"}
                          </Badge>
                        </div>
                        {barber.phone && (
                          <p className="text-sm text-muted-foreground">Tel: {barber.phone}</p>
                        )}
                        {barber.email && (
                          <p className="text-sm text-muted-foreground">Email: {barber.email}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMutation.mutate({ barberId: barber.id })}
                          title={barber.isActive === 1 ? "Dezactivează" : "Activează"}
                        >
                          {barber.isActive === 1 ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(barber)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirm(barber.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Șterge frizer?</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune nu poate fi anulată. Frizerul va fi șters permanent din sistem.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirm !== null) {
                    deleteMutation.mutate({ barberId: deleteConfirm });
                  }
                }}
              >
                Șterge
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
