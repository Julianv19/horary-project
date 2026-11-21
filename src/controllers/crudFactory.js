// =====================================================================
//  crudFactory.js
//  Genera los manejadores CRUD (listar, nuevo, crear, editar, actualizar,
//  eliminar) para cualquier recurso a partir de su configuración.
//  Las vistas genéricas 'crud/list' y 'crud/form' se encargan del render.
// =====================================================================

export function crudFactory(cfg) {
  const { model, basePath, singular, plural, columns, fields } = cfg;

  const flash = (req) => ({
    ok: req.query.ok || null,
    err: req.query.err || null,
  });

  return {
    // GET basePath  → listado
    list(req, res) {
      res.render('crud/list', {
        titulo: plural,
        basePath, singular, plural, columns,
        items: model.all(),
        flash: flash(req),
      });
    },

    // GET basePath/nuevo → formulario de alta
    formNew(req, res) {
      res.render('crud/form', {
        titulo: `Nuevo: ${singular}`,
        basePath, singular,
        action: basePath,
        item: {},
        fields: fields({}),
        error: null,
      });
    },

    // POST basePath → crear
    create(req, res) {
      try {
        model.create(req.body);
        res.redirect(`${basePath}?ok=${encodeURIComponent('Registro creado.')}`);
      } catch (e) {
        res.status(400).render('crud/form', {
          titulo: `Nuevo: ${singular}`,
          basePath, singular, action: basePath,
          item: req.body, fields: fields(req.body),
          error: e.message,
        });
      }
    },

    // GET basePath/:id/editar → formulario de edición
    formEdit(req, res) {
      const item = model.find(req.params.id);
      if (!item) return res.redirect(`${basePath}?err=${encodeURIComponent('No existe el registro.')}`);
      res.render('crud/form', {
        titulo: `Editar: ${singular}`,
        basePath, singular,
        action: `${basePath}/${item.id}`,
        item,
        fields: fields(item),
        error: null,
      });
    },

    // POST basePath/:id → actualizar
    update(req, res) {
      try {
        model.update(req.params.id, req.body);
        res.redirect(`${basePath}?ok=${encodeURIComponent('Registro actualizado.')}`);
      } catch (e) {
        const item = { ...req.body, id: req.params.id };
        res.status(400).render('crud/form', {
          titulo: `Editar: ${singular}`,
          basePath, singular, action: `${basePath}/${item.id}`,
          item, fields: fields(item),
          error: e.message,
        });
      }
    },

    // POST basePath/:id/eliminar → borrar
    remove(req, res) {
      try {
        model.remove(req.params.id);
        res.redirect(`${basePath}?ok=${encodeURIComponent('Registro eliminado.')}`);
      } catch (e) {
        res.redirect(`${basePath}?err=${encodeURIComponent('No se puede eliminar: tiene registros asociados.')}`);
      }
    },
  };
}

// Registra las 6 rutas estándar de un recurso en un router de Express.
export function registrarRutas(router, basePath, ctrl) {
  router.get(basePath, ctrl.list);
  router.get(`${basePath}/nuevo`, ctrl.formNew);
  router.post(basePath, ctrl.create);
  router.get(`${basePath}/:id/editar`, ctrl.formEdit);
  router.post(`${basePath}/:id`, ctrl.update);
  router.post(`${basePath}/:id/eliminar`, ctrl.remove);
}

export default crudFactory;
