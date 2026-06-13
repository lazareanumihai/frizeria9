import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Trash2, Edit2, Plus, Upload, X, Clock } from "lucide-react";
import { BarberScheduleManager } from "@/components/BarberScheduleManager";

export default function BarberManagementPage() {
  const { data: barbers, isLoading, refetch } = trpc.barbers.getAllAdmin.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const createMutation = trpc.barbers.create.useMutation({
    onSuccess: () => {
      refetch();
      setFormData({ name: "", phone: "", email: "", description: "" });
      setIsCreating(false);
    },
  });

  const updateMutation = trpc.barbers.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
      setFormData({ name: "", phone: "", email: "", description: "" });
      setPhotoPreview(null);
      setPhotoFile(null);
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

  const uploadPhotoMutation = trpc.barbers.uploadPhoto.useMutation({
    onSuccess: () => {
      refetch();
      setPhotoFile(null);
      setPhotoPreview(null);
      setUploadingPhoto(false);
    },
  });

  const deletePhotoMutation = trpc.barbers.deletePhoto.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const reorderMutation = trpc.barbers.reorder.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const [draggedBarberId, setDraggedBarberId] = useState<number | null>(null);
  const [sortedBarbers, setSortedBarbers] = useState<any[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [scheduleBarber, setScheduleBarber] = useState<{ id: number; name: string } | null>(null);

  // Update sortedBarbers when barbers data changes
  useEffect(() => {
    if (barbers) {
      setSortedBarbers([...barbers]);
    }
  }, [barbers]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadPhotoFile = async (barberId: number, file: File) => {
    setUploadingPhoto(true);
    const base64 = await fileToBase64(file);
    await uploadPhotoMutation.mutateAsync({
      barberId,
      fileData: base64,
      fileName: file.name,
    });
  };

  const handlePhotoUpload = async (barberId: number) => {
    if (!photoFile) return;
    await uploadPhotoFile(barberId, photoFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      // Also upload any staged photo so the user only needs to click
      // "Salvează modificări" (the separate "Încarcă poza" button is optional).
      const fileToUpload = photoFile;
      const barberId = editingId;
      await updateMutation.mutateAsync({
        barberId,
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        description: formData.description || undefined,
      });
      if (fileToUpload) {
        await uploadPhotoFile(barberId, fileToUpload);
      }
    } else {
      await createMutation.mutateAsync({
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        description: formData.description || undefined,
      });
    }
  };

  const handleBarberDragStart = (e: React.DragEvent, barberId: number) => {
    setDraggedBarberId(barberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBarberDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleBarberDrop = (e: React.DragEvent, targetBarberId: number) => {
    e.preventDefault();
    if (!draggedBarberId || draggedBarberId === targetBarberId) return;

    const draggedIndex = sortedBarbers.findIndex((b: any) => b.id === draggedBarberId);
    const targetIndex = sortedBarbers.findIndex((b: any) => b.id === targetBarberId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSorted = [...sortedBarbers];
    const [draggedItem] = newSorted.splice(draggedIndex, 1);
    newSorted.splice(targetIndex, 0, draggedItem);
    setSortedBarbers(newSorted);
    setDraggedBarberId(null);
  };

  const startEdit = (barber: any) => {
    setEditingId(barber.id);
    setFormData({
      name: barber.name,
      phone: barber.phone || "",
      email: barber.email || "",
      description: barber.description || "",
    });
    setPhotoPreview(barber.photoUrl || null);
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Descriere</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ex: Specialist în tuns modern cu 15 ani de experiență"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>

              {/* Photo Upload */}
              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Poza Frizer</label>
                  <div className="space-y-4">
                    {photoPreview && (
                      <div className="relative w-32 h-32">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg border border-border"
                        />
                        {photoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview(null);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition ${
                            isDragActive
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Upload className="w-4 h-4" />
                            {isDragActive ? 'Trage poza aici' : 'Selectează sau trage poza'}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </div>
                      </label>
                      {photoFile && (
                        <Button
                          type="button"
                          onClick={() => handlePhotoUpload(editingId)}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? "Se încarcă..." : "Încarcă poza"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                      setFormData({ name: "", phone: "", email: "", description: "" });
                      setPhotoPreview(null);
                      setPhotoFile(null);
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Frizeri ({barbers?.length || 0})</h2>
            {barbers && barbers.length > 1 && (
              <Button
                variant={isReorderMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isReorderMode && sortedBarbers) {
                    reorderMutation.mutate({
                      barberIds: sortedBarbers.map((b: any) => b.id),
                    });
                  }
                  setIsReorderMode(!isReorderMode);
                }}
              >
                {isReorderMode ? "Salvează ordine" : "Reordoneaza"}
              </Button>
            )}
          </div>

          {!barbers || barbers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nu sunt frizeri adăugați. Adaugă primul frizer pentru a începe!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(isReorderMode ? sortedBarbers : barbers).map((barber: any) => (
                <Card
                  key={barber.id}
                  draggable={isReorderMode}
                  onDragStart={(e: any) => isReorderMode && handleBarberDragStart(e, barber.id)}
                  onDragOver={isReorderMode ? handleBarberDragOver : undefined}
                  onDrop={(e: any) => isReorderMode && handleBarberDrop(e, barber.id)}
                  className={`${isReorderMode ? 'cursor-move hover:shadow-lg transition-shadow' : ''} ${draggedBarberId === barber.id ? 'opacity-50' : ''}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Photo */}
                      {barber.photoUrl && (
                        <div className="w-20 h-20 flex-shrink-0 relative group">
                          <img
                            src={barber.photoUrl}
                            alt={barber.name}
                            className="w-full h-full object-cover rounded-lg border border-border"
                          />
                          <button
                            onClick={() => deletePhotoMutation.mutate({ barberId: barber.id })}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Șterge poza"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Info */}
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
                        {barber.description && (
                          <p className="text-sm text-muted-foreground mt-2">{barber.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setScheduleBarber({ id: barber.id, name: barber.name })}
                          title="Gestionează program"
                        >
                          <Clock className="w-4 h-4" />
                        </Button>

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

        {/* Schedule Modal */}
        {scheduleBarber && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Program de Lucru</CardTitle>
                <button
                  onClick={() => setScheduleBarber(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent>
                <BarberScheduleManager
                  barberId={scheduleBarber.id}
                  barberName={scheduleBarber.name}
                  onClose={() => setScheduleBarber(null)}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
