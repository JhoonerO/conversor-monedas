-- Datos iniciales: proveedores, productos y precios (costo / precio final en pesos)
insert into public.providers (id,name) values ('edgar','Edgar'),('lina','Lina'),('ricardo','Ricardo'),('alex','Alex')
on conflict (id) do nothing;

insert into public.products (id,type,name,mono,cat,descr,hue,price,cost,days,active,stock,provider_id,items,badge,sort) values
('c-cine','combo','Combo Cine','C','combo','Las tres plataformas más pedidas',230,41000,26000,30,false,'ok',null,'{nf,dp,mx}',null,1),
('c-full','combo','Combo Full','C','combo','Cine, series y YouTube sin anuncios en un solo pago',230,66000,42000,30,false,'ok',null,'{nf,dp,mx,pv,yt}','Más vendido',2),
('nf','single','Netflix','N','video','1 pantalla · perfil propio',355,19000,12000,30,true,'ok','alex','{}',null,10),
('dp','single','Disney+','D+','video','1 pantalla · perfil propio',222,15000,8000,30,true,'ok','alex','{}',null,11),
('mx','single','HBO Max','M','video','1 pantalla · perfil propio',262,12000,6000,30,true,'ok','ricardo','{}',null,12),
('pv','single','Prime Video','PV','video','1 pantalla · perfil propio',196,12000,6000,30,true,'ok','ricardo','{}',null,13),
('pp','single','Paramount+','P+','video','1 pantalla · perfil propio',212,16000,12000,30,true,'ok','edgar','{}',null,14),
('cr','single','Crunchyroll','CR','video','Anime sin anuncios · 1 perfil',24,12000,7000,30,true,'ok','edgar','{}',null,15),
('px','single','Plex','PX','video','Películas y series · 1 perfil',40,12000,7000,30,true,'ok','edgar','{}',null,16),
('nu','single','Nuplin','NU','video','1 pantalla · perfil propio',300,25000,20000,30,true,'ok','edgar','{}',null,17),
('yt','single','YouTube Premium','YT','musica','Sin anuncios + YouTube Music',2,15000,10000,30,true,'ok','ricardo','{}',null,18),
('sp','single','Spotify','S','musica','Sin proveedor por ahora',142,0,0,30,true,'agotado',null,'{}',null,19),
('gp','single','ChatGPT','GPT','apps','Cuenta Plus',160,35000,28000,30,true,'ok','ricardo','{}',null,20),
('cc','single','CapCut','CC','apps','CapCut Pro',0,28000,23000,30,true,'ok','ricardo','{}',null,21)
on conflict (id) do nothing;

insert into public.offers (provider_id,product_id,cost,price) values
('edgar','nf',16000,19000),
('edgar','mx',8000,12000),
('edgar','pv',8000,12000),
('edgar','yt',12000,15000),
('edgar','dp',16000,19000),
('edgar','px',7000,12000),
('edgar','cr',7000,12000),
('edgar','pp',12000,16000),
('edgar','nu',20000,25000),
('lina','yt',12000,15000),
('ricardo','yt',10000,15000),
('ricardo','mx',6000,12000),
('ricardo','pv',6000,12000),
('ricardo','gp',28000,35000),
('ricardo','cc',23000,28000),
('alex','nf',12000,19000),
('alex','yt',10000,15000),
('alex','dp',8000,15000),
('alex','gp',null,null),
('alex','cc',null,null)
on conflict (provider_id,product_id) do nothing;

insert into public.settings (id,store,phone,warn_days,template) values
(1,'Kmi Entretenimiento','573001234567',5,'Hola {nombre}, tu {producto} {cuando} ({fecha}). ¿Lo renovamos? Son {precio} por 30 días y pagas por Nequi o Daviplata.')
on conflict (id) do nothing;
