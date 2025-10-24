"use client"

import { useState } from "react"
import { usePayroll } from "@/lib/payroll-context"
import { SidebarNav } from "@/components/sidebar-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil } from "lucide-react"
import { LegalParameterDialog } from "@/components/legal-parameter-dialog"
import { ISRBracketDialog } from "@/components/isr-bracket-dialog"
import type { LegalParameters } from "@/lib/types"

export default function ParametrosPage() {
  const { legalParameters, isrBrackets } = usePayroll()
  const [paramDialogOpen, setParamDialogOpen] = useState(false)
  const [isrDialogOpen, setIsrDialogOpen] = useState(false)
  const [editingParam, setEditingParam] = useState<LegalParameters | undefined>()

  const handleEditParam = (param: LegalParameters) => {
    setEditingParam(param)
    setParamDialogOpen(true)
  }

  const handleParamDialogClose = () => {
    setParamDialogOpen(false)
    setEditingParam(undefined)
  }

  const seguroSocialParams = legalParameters.filter((p) => p.tipo.includes("seguro_social"))
  const seguroParams = legalParameters.filter((p) => p.tipo === "seguro_educativo")
  const otrosParams = legalParameters.filter((p) => p.tipo === "otro")

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Parámetros Legales</h1>
          <p className="text-muted-foreground">Configure las tasas y parámetros legales para el cálculo de planilla</p>
        </div>

        <Tabs defaultValue="seguro-social" className="space-y-6">
          <TabsList>
            <TabsTrigger value="seguro-social">Seguro Social</TabsTrigger>
            <TabsTrigger value="seguro">Seguro Educativo</TabsTrigger>
            <TabsTrigger value="isr">ISR</TabsTrigger>
            <TabsTrigger value="otros">Otros</TabsTrigger>
          </TabsList>

          <TabsContent value="seguro-social">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Seguro Social</CardTitle>
                    <CardDescription>Tasas de contribución para empleado y empleador</CardDescription>
                  </div>
                  <Button onClick={() => setParamDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Parámetro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Porcentaje</TableHead>
                        <TableHead>Fecha Vigencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seguroSocialParams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No hay parámetros configurados
                          </TableCell>
                        </TableRow>
                      ) : (
                        seguroSocialParams.map((param) => (
                          <TableRow key={param.id}>
                            <TableCell className="font-medium">{param.nombre}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {param.tipo === "seguro_social_empleado" ? "Empleado" : "Empleador"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{param.porcentaje}%</TableCell>
                            <TableCell>{new Date(param.fechaVigencia).toLocaleDateString("es-PA")}</TableCell>
                            <TableCell>
                              <Badge variant={param.activo ? "default" : "secondary"}>
                                {param.activo ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEditParam(param)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguro">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Seguro Educativo</CardTitle>
                    <CardDescription>Tasa de contribución al seguro educativo</CardDescription>
                  </div>
                  <Button onClick={() => setParamDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Parámetro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Porcentaje</TableHead>
                        <TableHead>Fecha Vigencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seguroParams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No hay parámetros configurados
                          </TableCell>
                        </TableRow>
                      ) : (
                        seguroParams.map((param) => (
                          <TableRow key={param.id}>
                            <TableCell className="font-medium">{param.nombre}</TableCell>
                            <TableCell className="text-right font-mono">{param.porcentaje}%</TableCell>
                            <TableCell>{new Date(param.fechaVigencia).toLocaleDateString("es-PA")}</TableCell>
                            <TableCell>
                              <Badge variant={param.activo ? "default" : "secondary"}>
                                {param.activo ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEditParam(param)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="isr">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Impuesto Sobre la Renta (ISR)</CardTitle>
                    <CardDescription>Tramos y tasas del impuesto sobre la renta</CardDescription>
                  </div>
                  <Button onClick={() => setIsrDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Tramos ISR
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Desde</TableHead>
                        <TableHead>Hasta</TableHead>
                        <TableHead className="text-right">Porcentaje</TableHead>
                        <TableHead className="text-right">Deducción Fija</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isrBrackets.map((bracket) => (
                        <TableRow key={bracket.id}>
                          <TableCell className="font-mono">
                            ${bracket.desde.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-mono">
                            {bracket.hasta
                              ? `$${bracket.hasta.toLocaleString("es-PA", { minimumFractionDigits: 2 })}`
                              : "En adelante"}
                          </TableCell>
                          <TableCell className="text-right font-mono">{bracket.porcentaje}%</TableCell>
                          <TableCell className="text-right font-mono">
                            ${bracket.deduccionFija.toLocaleString("es-PA", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 rounded-lg bg-muted p-4">
                  <h4 className="font-semibold mb-2">Información sobre ISR</h4>
                  <p className="text-sm text-muted-foreground">
                    El ISR se calcula sobre el salario anual del empleado. Los tramos son acumulativos, aplicando el
                    porcentaje correspondiente a cada rango de ingresos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="otros">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Otros Parámetros</CardTitle>
                    <CardDescription>Parámetros adicionales personalizados</CardDescription>
                  </div>
                  <Button onClick={() => setParamDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Parámetro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Porcentaje</TableHead>
                        <TableHead>Fecha Vigencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otrosParams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No hay parámetros configurados
                          </TableCell>
                        </TableRow>
                      ) : (
                        otrosParams.map((param) => (
                          <TableRow key={param.id}>
                            <TableCell className="font-medium">{param.nombre}</TableCell>
                            <TableCell className="text-right font-mono">{param.porcentaje}%</TableCell>
                            <TableCell>{new Date(param.fechaVigencia).toLocaleDateString("es-PA")}</TableCell>
                            <TableCell>
                              <Badge variant={param.activo ? "default" : "secondary"}>
                                {param.activo ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEditParam(param)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <LegalParameterDialog open={paramDialogOpen} onOpenChange={handleParamDialogClose} parameter={editingParam} />
        <ISRBracketDialog open={isrDialogOpen} onOpenChange={setIsrDialogOpen} />
      </main>
    </div>
  )
}
