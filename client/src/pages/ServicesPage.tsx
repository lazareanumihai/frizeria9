import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Edit2, X, Save } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ServicesPage() {
  const [, navigate] = useLocation();
  const [newService, setNewService] = useState({ name: "", price: "", duration: 30, description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", price: "", duration: 30, description: "" });

  const { data: services = [], isLoading, refetch } = trpc.services.getAll.useQuery();
  const createMutation = trpc.services.create.useMutation();
  const updateMutation = trpc.services.update.useMutation();
  const deleteMutation = trpc.services.delete.useMutation();

  const handleCreate = async () => {
    if (!newService.name || !newService.price) {
      toast.error("Completează toate câmpurile obligatorii");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: newService.name,
        price: newService.price,
        duration: newService.duration,
        description: newService.description,
      });
      setNewService({ name: "", price: "", duration: 30, description: "" });
      refetch();
      toast.success("Serviciu adăugat cu succes!");
    } catch (error) {
      toast.error("Eroare la adăugarea serviciului");
    }
  };

  const handleStartEdit = (service: any) => {
    setEditingId(service.id);
    setEditData({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration,
      description: service.description || "",
    });
  };

  const handleSaveEdit = async (serviceId: number) => {
    if (!editData.name || !editData.price) {
      toast.error("Completează toate câmpurile obligatorii");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        serviceId,
        name: editData.name,
        price: editData.price,
        duration: editData.duration,
        description: editData.description,
      });
      setEditingId(null);
      refetch();
      toast.success("Serviciu actualizat cu succes!");
    } catch (error) {
      toast.error("Eroare la actualizarea serviciului");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ name: "", price: "", duration: 30, description: "" });
  };

  const handleDelete = async (serviceId: number) => {
    if (!confirm("Ești sigur că vrei să ștergi acest serviciu?")) return;

    try {
      await deleteMutation.mutateAsync({ serviceId });
      refetch();
      toast.success("Serviciu șters cu succes!");
    } catch (error) {
      toast.error("Eroare la ștergerea serviciului");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestionare Servicii</h1>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Înapoi
          </Button>
        </div>

        {/* Add New Service */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Adaugă Serviciu Nou</CardTitle>
            <CardDescription>Completează detaliile pentru un nou serviciu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nume Serviciu *</Label>
                <Input
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="ex: Tuns Barbă"
                />
              </div>
              <div>
                <Label>Preț (RON) *</Label>
                <Input
                  type="number"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  placeholder="ex: 50"
                />
              </div>
              <div>
                <Label>Durată (minute)</Label>
                <Input
                  type="number"
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                  min="15"
                  step="15"
                />
              </div>
              <div>
                <Label>Descriere</Label>
                <Input
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  placeholder="ex: Tuns profesional cu finisaj"
                />
              </div>
            </div>
            <Button onClick={handleCreate} className="mt-4 w-full" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Serviciu
            </Button>
          </CardContent>
        </Card>

        {/* Services List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Servicii Active</h2>
          {isLoading ? (
            <div className="text-center py-8">Se încarcă...</div>
          ) : services.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nu sunt servicii adăugate. Adaugă o serviciu nouă pentru a începe.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <Card key={service.id}>
                  {editingId === service.id ? (
                    // Edit Mode
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Nume Serviciu *</Label>
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            placeholder="ex: Tuns Barbă"
                          />
                        </div>
                        <div>
                          <Label>Preț (RON) *</Label>
                          <Input
                            type="number"
                            value={editData.price}
                            onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                            placeholder="ex: 50"
                          />
                        </div>
                        <div>
                          <Label>Durată (minute)</Label>
                          <Input
                            type="number"
                            value={editData.duration}
                            onChange={(e) => setEditData({ ...editData, duration: parseInt(e.target.value) })}
                            min="15"
                            step="15"
                          />
                        </div>
                        <div>
                          <Label>Descriere</Label>
                          <Input
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            placeholder="ex: Tuns profesional cu finisaj"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveEdit(service.id)}
                            className="flex-1"
                            disabled={updateMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Salvează
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Anulează
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    // View Mode
                    <>
                      <CardHeader>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <CardDescription>{service.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Preț:</span>
                            <span className="font-bold text-lg text-primary">{service.price} RON</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Durată:</span>
                            <span>{service.duration} min</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleStartEdit(service)}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Editează
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(service.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
