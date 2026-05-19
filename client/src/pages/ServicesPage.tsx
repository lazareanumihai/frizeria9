import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Edit2, X, Save, Eye, EyeOff, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ServicesPage() {
  const [, navigate] = useLocation();
  const [newService, setNewService] = useState({ name: "", price: "", duration: 30, description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", price: "", duration: 30, description: "", imageUrl: "" });
  const [uploadingServiceId, setUploadingServiceId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const { data: allServices = [], isLoading, refetch } = trpc.services.getAllAdmin.useQuery();
  const createMutation = trpc.services.create.useMutation();
  const updateMutation = trpc.services.update.useMutation();
  const deleteMutation = trpc.services.delete.useMutation();
  const toggleMutation = trpc.services.toggle.useMutation();
  const uploadImageMutation = trpc.services.uploadImage.useMutation();

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
      imageUrl: service.imageUrl || "",
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
        imageUrl: editData.imageUrl,
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
    setEditData({ name: "", price: "", duration: 30, description: "", imageUrl: "" });
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

  const handleToggle = async (serviceId: number) => {
    try {
      await toggleMutation.mutateAsync({ serviceId });
      refetch();
      toast.success("Status serviciu actualizat!");
    } catch (error) {
      toast.error("Eroare la actualizarea statusului serviciului");
    }
  };

  const handleImageUpload = async (serviceId: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Selectează o imagine validă");
      return;
    }

    setUploadingServiceId(serviceId);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(',')[1];
          const result = await uploadImageMutation.mutateAsync({
            fileName: file.name,
            fileData: base64,
            mimeType: file.type,
          });

          // Update service with image URL
          await updateMutation.mutateAsync({
            serviceId,
            imageUrl: result.url,
          });

          refetch();
          toast.success("Imagine încărcată cu succes!");
        } catch (error) {
          toast.error("Eroare la încărcarea imaginii");
        } finally {
          setUploadingServiceId(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Eroare la procesarea imaginii");
      setUploadingServiceId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent, serviceId: number) => {
    e.preventDefault();
    setDragOverId(serviceId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, serviceId: number) => {
    e.preventDefault();
    setDragOverId(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(serviceId, files[0]);
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
          <h2 className="text-2xl font-bold mb-2">Toate Serviciile</h2>
          <p className="text-sm text-muted-foreground mb-4">Doar serviciile active vor fi disponibile pentru clienți în formularul de programare. Poți dezactiva temporar un serviciu fără a-l șterge. Trage o imagine pe serviciu pentru a o încărca.</p>
          {isLoading ? (
            <div className="text-center py-8">Se încarcă...</div>
          ) : allServices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nu sunt servicii adăugate. Adaugă o serviciu nouă pentru a începe.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allServices.map((service) => (
                <Card key={service.id} className={`${service.isActive === 0 ? "opacity-60" : ""} ${dragOverId === service.id ? "ring-2 ring-primary" : ""}`}>
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
                    <div
                      onDragOver={(e) => handleDragOver(e, service.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, service.id)}
                      className="cursor-pointer"
                    >
                      {service.imageUrl ? (
                        <div className="relative">
                          <img src={service.imageUrl} alt={service.name} className="w-full h-40 object-cover" />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition flex items-center justify-center opacity-0 hover:opacity-100">
                            <Upload className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                          <div className="text-center">
                            <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Trage imagine aici</p>
                          </div>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{service.name}</CardTitle>
                            <CardDescription>{service.description}</CardDescription>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                            service.isActive === 1
                              ? "bg-green-500/20 text-green-700 dark:text-green-400"
                              : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                          }`}>
                            {service.isActive === 1 ? "Activ" : "Inactiv"}
                          </span>
                        </div>
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
                            variant={service.isActive === 1 ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => handleToggle(service.id)}
                            disabled={toggleMutation.isPending}
                            title={service.isActive === 1 ? "Dezactivează" : "Activează"}
                          >
                            {service.isActive === 1 ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
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
                    </div>
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
