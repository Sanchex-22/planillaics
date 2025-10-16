export function exportToExcel(data: Array<Record<string, any>>, filename: string) {
  if (data.length === 0) {
    console.error("No data to export")
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])

  // Create CSV content
  let csvContent = headers.join(",") + "\n"

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header]
      // Handle values that might contain commas or quotes
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvContent += values.join(",") + "\n"
  })

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
