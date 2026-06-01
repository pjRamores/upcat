{rows.map((row) => (
  <tr key={String(row._id)}>
    <td className="px-3·py-2·font-mono·text-xs">{String(row._id)}</td>
    <td className="px-3·py-2">{String(row.page·??·")}</td>
    <td className="px-3·py-2">{String(row.title·??·")}</td>
    <td className="px-3·py-2">{String(row.type·??·")}</td>
    <td className="px-3·py-2">{String(row.isActive·??·")}</td>
    <td className="px-3·py-2">
      <button type="button" className="rounded·border·border-slate-300·px-2·py-1·text-xs"
        onClick={() => setForm({...row, id: String(row._id)})}>
        Edit JSON
      </button>
    </td>
  </tr>
))}
</tbody>
</table>
</div>
</section>
</div>
);