-- Datos de pago que salen en los mensajes de cobro y renovación (se cambian en Ajustes).
alter table public.settings add column if not exists pay_info text not null default 'Nequi o Llave Bre-B al 313 426 6055';
update public.settings
   set template = 'Hola {nombre}, tu {producto} {cuando} ({fecha}). ¿Lo renovamos? Son {precio} por 30 días. Puedes pagar por {pago}.'
 where id = 1 and template not like '%{pago}%';
